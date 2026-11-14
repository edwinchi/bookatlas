import express, { type Express, type Request, type Response } from 'express';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { logger } from '../../lib/logger.js';
import { checkoutStatus, createCheckout, handleWebhook, paymentsConfigured } from './checkout.js';
import { PaymentError, purchasedBookIds } from './purchases.js';
import { invoiceForUser, invoiceNumber, invoicesOf, renderInvoiceHtml, sellerDetails, vatSummary } from './invoices.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof PaymentError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error({ err: error }, 'Payment request failed');
      res.status(503).json({ error: 'Payments are temporarily unavailable. You have not been charged; please retry.' });
    }
  };
}

/**
 * Stripe Checkout (TASK-0004). Mount before the app-wide JSON parser: the webhook signature is
 * checked against the raw request body.
 */
export function mountPayments(app: Express, findBook: (id: string) => Promise<Book | null | undefined>, appUrl: string) {
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), guarded(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw new PaymentError('Expected a Stripe event.', 415);
    res.json(await handleWebhook(req.body, req.get('stripe-signature')));
  }));

  const json = express.json({ limit: '16kb' });
  app.get('/api/payments/config', (_req, res) => {
    res.json({ enabled: paymentsConfigured(), currency: 'EUR' });
  });
  app.post('/api/checkout/sessions', json, guarded(async (req, res) => {
    res.status(201).json(await createCheckout(req.bookatlasIdentity!, req.body?.bookIds, findBook, appUrl));
  }));
  app.get('/api/checkout/sessions/:id', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(await checkoutStatus(req.bookatlasIdentity!, String(req.params.id)));
  }));
  app.get('/api/purchases', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ bookIds: await purchasedBookIds(req.bookatlasIdentity!.id) });
  }));
  // Invoices (owner decision 2026-11-14: BookAtlas handles VAT). Buyers see only their own.
  app.get('/api/invoices', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const invoices = await invoicesOf(req.bookatlasIdentity!.id);
    res.json({ invoices: invoices.map((i) => ({
      seq: i.seq, number: invoiceNumber(i), issuedAt: i.issued_at, status: i.status, currency: i.currency,
      grossCents: i.amount_gross, vatCents: i.amount_vat, books: i.lines.map((l) => ({ bookId: l.bookId, title: l.title })),
    })) });
  }));
  app.get('/api/invoices/:seq', guarded(async (req, res) => {
    const seq = Number(req.params.seq);
    if (!Number.isSafeInteger(seq) || seq < 1) throw new PaymentError('Unknown invoice.', 404);
    const invoice = await invoiceForUser(req.bookatlasIdentity!.id, seq);
    res.setHeader('Cache-Control', 'private, no-store');
    res.type('html').send(renderInvoiceHtml(invoice));
  }));
  app.get('/api/manager/vat-summary', guarded(async (req, res) => {
    // The access policy already makes /api/manager admin-only; checked here too, as other admin routes do.
    if (req.bookatlasIdentity?.role !== 'admin') throw new PaymentError('Administrator access is required.', 403);
    res.setHeader('Cache-Control', 'private, no-store');
    const seller = sellerDetails();
    res.json({ ...(await vatSummary()), sellerDetailsComplete: seller.complete });
  }));
}
