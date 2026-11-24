import express, { type Express, type Request, type Response } from 'express';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { logger } from '../../lib/logger.js';
import { confirmCheckout, createPrintCheckout, paymentsConfigured, setPrintHandlers } from '../payments/checkout.js';
import { PaymentError } from '../payments/purchases.js';
import { finishUpload, getEdition, PrintError, receiveMemoryUpload, saveEdition, setPrintCatalog, startUpload } from './editions.js';
import { isPrintFileKind, MAX_MEMORY_UPLOAD_BYTES, PrintFileError } from './files.js';
import { LuluError, luluConfigured, luluLive } from './lulu.js';
import { allPrintOrders, createOrder, handleLuluWebhook, printOrdersOf, printPaid, printRefunded, publicOrder, quoteOrder, refreshOrder, retryOrder } from './orders.js';
import { MAX_COPIES, SHIPPING_LEVELS } from './pricing.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof PrintError || error instanceof PrintFileError || error instanceof LuluError || error instanceof PaymentError) {
        res.status(error.status).json({ error: error.message }); return;
      }
      logger.error({ err: error }, 'Print request failed');
      res.status(503).json({ error: 'Printed books are temporarily unavailable. You have not been charged; please retry.' });
    }
  };
}

const signedIn = (req: Request) => {
  if (!req.bookatlasIdentity) throw new PrintError('Please sign in with a verified email address.', 401);
  return req.bookatlasIdentity;
};
const admin = (req: Request) => {
  const who = signedIn(req);
  if (who.role !== 'admin') throw new PrintError('Administrator access is required.', 403);
  return who;
};
const kindOf = (req: Request) => {
  if (!isPrintFileKind(req.params.kind)) throw new PrintError('Unknown file.', 404);
  return req.params.kind;
};

/**
 * Printed books sold and shipped by BooksAtlas (owner request 2026-11-24). Mount before the app-wide JSON parser:
 * Lulu's webhook is verified against its raw body.
 */
export function mountPrint(app: Express, catalog: { get(id: string): Promise<Book | null> }, saveBook: (book: Book) => Promise<void>, appUrl: string) {
  setPrintCatalog({ get: (id) => catalog.get(id), save: saveBook }, appUrl);
  setPrintHandlers((paid) => printPaid(paid, appUrl), printRefunded);
  const json = express.json({ limit: '16kb' });
  const findBook = (id: string) => catalog.get(id);

  app.post('/api/lulu/webhook', express.raw({ type: '*/*', limit: '256kb' }), guarded(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw new PrintError('Expected a Lulu event.', 415);
    res.json(await handleLuluWebhook(req.body, req.get('lulu-hmac-sha256') ?? undefined));
  }));

  app.get('/api/print/config', (_req, res) => {
    res.json({ enabled: luluConfigured() && paymentsConfigured(), live: luluLive(), maxCopies: MAX_COPIES, shippingLevels: SHIPPING_LEVELS });
  });

  // Readers: price, checkout, the success page and their orders.
  app.post('/api/print/quote', json, guarded(async (req, res) => {
    const q = await quoteOrder(signedIn(req), req.body, findBook);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ bookId: q.bookId, title: q.title, quantity: q.quantity, shippingLevel: q.level, unitPriceCents: q.quote.unitPrice, booksCents: q.quote.bookGross, shippingCents: q.quote.shippingGross, totalCents: q.quote.totalGross, vatRateBp: q.quote.rateBp });
  }));
  app.post('/api/print/orders', json, guarded(async (req, res) => {
    if (!paymentsConfigured()) throw new PrintError('Payments are not set up yet.', 503);
    res.status(201).json(await createOrder(signedIn(req), req.body, findBook, createPrintCheckout, appUrl));
  }));
  app.post('/api/print/confirm', json, guarded(async (req, res) => {
    res.json({ paid: await confirmCheckout(signedIn(req), String(req.body?.sessionId ?? '')) });
  }));
  app.get('/api/print/orders', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ orders: (await printOrdersOf(signedIn(req).id)).map(publicOrder) });
  }));
  app.post('/api/print/orders/:id/refresh', guarded(async (req, res) => {
    res.json(publicOrder(await refreshOrder(signedIn(req), String(req.params.id))));
  }));

  // Authors: the printed edition of their published book.
  app.get('/api/print/editions/:bookId', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(await getEdition(signedIn(req), String(req.params.bookId)));
  }));
  app.put('/api/print/editions/:bookId', json, guarded(async (req, res) => {
    res.json(await saveEdition(signedIn(req), String(req.params.bookId), req.body));
  }));
  app.post('/api/print/editions/:bookId/files/:kind/start', json, guarded(async (req, res) => {
    res.json(await startUpload(signedIn(req), String(req.params.bookId), kindOf(req), req.body?.size));
  }));
  app.post('/api/print/editions/:bookId/files/:kind/done', guarded(async (req, res) => {
    res.json(await finishUpload(signedIn(req), String(req.params.bookId), kindOf(req)));
  }));
  // Local stack only (no Supabase storage): the PDF through the API, 4 MB at most.
  app.put('/api/print/editions/:bookId/files/:kind', express.raw({ type: 'application/pdf', limit: MAX_MEMORY_UPLOAD_BYTES }), guarded(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw new PrintError('Send the file as application/pdf.', 415);
    res.json(await receiveMemoryUpload(signedIn(req), String(req.params.bookId), kindOf(req), new Uint8Array(req.body)));
  }));

  // Owner: every printed-book order, with costs, and a retry for orders that never reached the printer.
  app.get('/api/manager/print-orders', guarded(async (req, res) => {
    admin(req);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ configured: luluConfigured(), live: luluLive(), orders: (await allPrintOrders()).map((o) => ({ ...publicOrder(o), userId: o.user_id, email: o.address.email, quote: o.quote, luluJobId: o.lulu_job_id, luluStatus: o.lulu_status, error: o.error })) });
  }));
  app.post('/api/manager/print-orders/:id/retry', guarded(async (req, res) => {
    admin(req);
    const order = await retryOrder(String(req.params.id), appUrl);
    res.json(order ? publicOrder(order) : null);
  }));
}
