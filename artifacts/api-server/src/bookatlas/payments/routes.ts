import express, { type Express, type Request, type Response } from 'express';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { logger } from '../../lib/logger.js';
import { backfillInvoices, checkoutStatus, createCheckout, handleWebhook, paymentsConfigured, refundPayment } from './checkout.js';
import { PaymentError, purchasedBookIds } from './purchases.js';
import { REFUND_WINDOW_DAYS, invoiceBySeq, invoiceForUser, invoiceNumber, invoicesOf, recordRefundDecision, refundRequests, refundState, refundableUntil, renderInvoiceHtml, requestRefund, sellerDetails, vatSummary, type Invoice } from './invoices.js';

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

const seqParam = (raw: unknown) => {
  const seq = Number(raw);
  if (!Number.isSafeInteger(seq) || seq < 1) throw new PaymentError('Unknown invoice.', 404);
  return seq;
};
/** The access policy already makes /api/manager admin-only; checked here too, as other admin routes do. */
function requireAdmin(req: Request) {
  if (req.bookatlasIdentity?.role !== 'admin') throw new PaymentError('Administrator access is required.', 403);
}
const summary = (i: Invoice) => ({
  seq: i.seq, number: invoiceNumber(i), issuedAt: i.issued_at, status: i.status, currency: i.currency,
  grossCents: i.amount_gross, vatCents: i.amount_vat, books: i.lines.map((l) => ({ bookId: l.bookId, title: l.title })),
  refund: {
    state: refundState(i), until: refundableUntil(i), requestedAt: i.refund_requested_at, decision: i.refund_decision,
    // Without a recorded waiver the buyer still has the statutory 14-day right of withdrawal: refund on request.
    statutoryWithdrawal: !i.withdrawal_waiver_at,
  },
});

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
    res.status(201).json(await createCheckout(req.bookatlasIdentity!, req.body?.bookIds, findBook, appUrl, req.body?.withdrawalWaiver));
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
    let invoices = await invoicesOf(req.bookatlasIdentity!.id);
    if (paymentsConfigured() && await backfillInvoices(req.bookatlasIdentity!.id)) invoices = await invoicesOf(req.bookatlasIdentity!.id);
    res.json({ refundWindowDays: REFUND_WINDOW_DAYS, invoices: invoices.map(summary) });
  }));
  app.get('/api/invoices/:seq', guarded(async (req, res) => {
    const invoice = await invoiceForUser(req.bookatlasIdentity!.id, seqParam(req.params.seq));
    res.setHeader('Cache-Control', 'private, no-store');
    res.type('html').send(renderInvoiceHtml(invoice));
  }));
  app.post('/api/invoices/:seq/refund-request', json, guarded(async (req, res) => {
    await requestRefund(req.bookatlasIdentity!.id, seqParam(req.params.seq), req.body?.reason);
    res.status(202).json(summary(await invoiceForUser(req.bookatlasIdentity!.id, seqParam(req.params.seq))));
  }));
  app.get('/api/manager/refund-requests', guarded(async (req, res) => {
    requireAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ requests: (await refundRequests()).map((i) => ({ ...summary(i), buyerEmail: i.buyer_email, reason: i.refund_reason, decidedAt: i.refund_decided_at })) });
  }));
  app.post('/api/manager/refund-requests/:seq/:decision', json, guarded(async (req, res) => {
    requireAdmin(req);
    const decision = req.params.decision === 'approve' ? 'approved' : req.params.decision === 'decline' ? 'declined' : null;
    if (!decision) throw new PaymentError('Unknown decision.', 404);
    const invoice = await invoiceBySeq(seqParam(req.params.seq));
    if (refundState(invoice) !== 'requested') throw new PaymentError('This order has no open refund request.', 409);
    if (decision === 'approved') {
      if (!invoice.payment_intent_id) throw new PaymentError('This order has no Stripe payment to refund.', 409);
      // Stripe first: the decision is only recorded once the money is on its way back.
      await refundPayment(invoice.payment_intent_id, invoice.seq);
    }
    await recordRefundDecision(invoice.seq, decision, req.bookatlasIdentity!.id);
    res.json(summary(await invoiceBySeq(invoice.seq)));
  }));
  app.get('/api/manager/vat-summary', guarded(async (req, res) => {
    requireAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store');
    const seller = sellerDetails();
    res.json({ ...(await vatSummary()), sellerDetailsComplete: seller.complete });
  }));
}
