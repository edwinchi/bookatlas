import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
const WEBHOOK_SECRET = 'whsec_synthetic_test_secret_for_bookatlas_narration';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';
import { stripeWebhooks } from '../../artifacts/api-server/src/bookatlas/payments/testFixtures.ts';
import type { StripeClient } from '../../artifacts/api-server/src/bookatlas/payments/checkout.ts';

const sessions = new Map<string, Record<string, any>>();
const refunds: Record<string, any>[] = [];
const fakeStripe = {
  checkout: { sessions: {
    create: async (params: Record<string, any>) => {
      const id = `cs_test_${'n'.repeat(20)}${sessions.size + 1}`;
      sessions.set(id, { id, object: 'checkout.session', status: 'open', payment_status: 'unpaid', client_reference_id: params.client_reference_id, metadata: params.metadata, currency: 'eur', amount_total: params.line_items[0].price_data.unit_amount, payment_intent: `pi_narr_${sessions.size + 1}`, params });
      return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
    },
    retrieve: async (id: string) => sessions.get(id),
    listLineItems: async () => ({ data: [] }),
  } },
  refunds: { create: async (p: Record<string, any>) => { refunds.push(p); return { id: 're_n' }; } },
  webhooks: stripeWebhooks,
} as unknown as StripeClient;

// A fake Gemini voice: one second of 24 kHz PCM per call, or failures when asked.
let failing = 0;
/** A Gemini quota error every call while set. */
let quotaError: string | null = null;
const calls: string[] = [];
const fakeVoice = {
  async speak(text: string) {
    calls.push(text);
    if (quotaError) throw new Error(quotaError);
    if (failing > 0) { failing -= 1; throw new Error('Gemini overloaded'); }
    return { audio: new Uint8Array(24_000 * 2).map((_, i) => (i % 2 ? 0x10 : 0)), mimeType: 'audio/L16;codec=pcm;rate=24000' };
  },
};

let service: typeof import('../../artifacts/api-server/src/bookatlas/narration/service.ts');
let routes: typeof import('../../artifacts/api-server/src/bookatlas/narration/routes.ts');
before(async () => {
  const checkout = await import('../../artifacts/api-server/src/bookatlas/payments/checkout.ts');
  checkout.setStripeClient(fakeStripe);
  service = await import('../../artifacts/api-server/src/bookatlas/narration/service.ts');
  routes = await import('../../artifacts/api-server/src/bookatlas/narration/routes.ts');
  service.setNarrationProvider(fakeVoice);
});
after(async () => { service.setNarrationProvider(null); delete process.env.STRIPE_WEBHOOK_SECRET; await closeSharedTestServer(); });

const json = (body: unknown, role = 'admin') => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string) => ({ headers: { 'x-test-role': role } });

/** The book belongs to an ordinary author account (who pays for narration); an administrator publishes it. */
async function publishBook(fetch: (path: string, init?: RequestInit) => Promise<Response>, owner = 'author') {
  const file = epub2(5);
  const intake = {
    title: 'The Narrated Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 4.99, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const s = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'n.epub', size: file.byteLength }, owner))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': owner }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${s.id}/prepare`, json({}, owner));
  return (await (await fetch(`/api/ebook-submissions/${s.id}/publish`, json({}))).json()).bookId as string;
}

test('natural narration: author orders and pays, an administrator approves, steps narrate it, readers hear it', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch);

  assert.equal((await fetch(`/api/narration/books/${bookId}`, as('reader'))).status, 404, 'only the book\'s author sees the offer');
  // Covers are served in display sizes (area-averaged, sharpened) for crisp store cards.
  const small = await fetch(`/api/catalog/covers/${bookId}-w360.jpg`);
  assert.equal(small.status, 200);
  const { imageSize } = await import('../../artifacts/api-server/src/bookatlas/ebookPrep/images.ts');
  assert.ok((imageSize(new Uint8Array(await small.arrayBuffer()))?.width ?? 0) <= 360, 'the card size is at most 360 pixels wide');
  assert.equal((await fetch(`/api/catalog/covers/${bookId}-w999.jpg`)).status, 404, 'only the defined sizes');
  const q = await (await fetch(`/api/narration/books/${bookId}`, as('author'))).json();
  assert.equal(q.priceCents, 2499);
  assert.equal(q.free, false, 'authors pay');
  assert.deepEqual(q.voices, ['Sulafat', 'Charon']);
  assert.equal(q.current, null);

  assert.equal((await fetch(`/api/narration/books/${bookId}/order`, json({ voice: 'Robot' }, 'author'))).status, 400);
  const ordered = await fetch(`/api/narration/books/${bookId}/order`, json({ voice: 'Sulafat' }, 'author'));
  assert.equal(ordered.status, 201);
  assert.match((await ordered.json()).url, /^https:\/\/checkout\.stripe\.com\//);
  const [session] = [...sessions.values()];
  assert.equal(session!.metadata.kind, 'narration');
  assert.equal(session!.params.line_items[0].price_data.unit_amount, 2499, 'the server sets the price');
  assert.equal((await fetch(`/api/narration/books/${bookId}/order`, json({ voice: 'Charon' }, 'author'))).status, 201, 'an unpaid order can be replaced');

  // Paying: the signed webhook marks the order paid and issues a 21% VAT invoice.
  Object.assign(session!, { status: 'complete', payment_status: 'paid', customer_details: { email: 'eddy@example.com', name: 'Eddy', address: { country: 'NL' } } });
  const payload = JSON.stringify({ id: 'evt_narr', object: 'event', type: 'checkout.session.completed', data: { object: session } });
  const paid = await fetch('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': stripeWebhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) }, body: payload });
  assert.equal(paid.status, 200);
  const invoices = (await (await fetch('/api/invoices', as('author'))).json()).invoices;
  const inv = invoices.find((i: { books: { title: string }[] }) => /Natural audiobook narration/.test(i.books[0]!.title));
  assert.deepEqual({ gross: inv.grossCents, vat: inv.vatCents }, { gross: 2499, vat: 434 }, '21% Dutch VAT on the service');

  const list = (await (await fetch('/api/manager/narrations', as('admin'))).json()).narrations;
  const order = list.find((n: { status: string }) => n.status === 'paid');
  assert.ok(order, 'the paid order waits for approval');
  assert.equal((await fetch('/api/manager/narrations', as('reader'))).status, 403);
  assert.equal((await fetch(`/api/manager/narrations/${order.id}/approve`, json({}, 'reader'))).status, 403);
  assert.equal(calls.length, 0, 'nothing is narrated before approval');
  assert.equal((await (await fetch(`/api/manager/narrations/${order.id}/approve`, json({}))).json()).status, 'approved');

  // Steps: a wrong key is refused; two at once never narrate the same segment.
  const stepCall = (key = routes.stepKey()) => fetch('/api/internal/narration/step', { method: 'POST', headers: { 'content-type': 'application/json', 'x-narration-key': key }, body: JSON.stringify({ id: order.id }) });
  assert.equal((await stepCall('wrong')).status, 403);
  failing = 3;
  for (let i = 0; i < 3; i += 1) await stepCall();
  const stopped = (await service.getNarration(order.id))!;
  assert.equal(stopped.status, 'failed', 'three failures stop the narration');
  assert.match(stopped.error!, /Segment 1 failed 3 times/);
  assert.equal(stopped.done, 0);
  assert.equal((await (await fetch(`/api/manager/narrations/${order.id}/resume`, json({}))).json()).status, 'approved');
  // Free tier first (Google Cloud Chirp 3 HD): no cost; when it fails, Gemini takes over and is counted.
  let freeCalls = 0;
  service.setFreeTierProvider({ async speak(_text: string, voice: string, locale: string) {
    freeCalls += 1;
    assert.equal(locale, 'en-US'); assert.equal(voice, 'Sulafat');
    if (freeCalls > 1) throw new Error('Chirp quota exhausted');
    return { audio: new Uint8Array(24_000 * 2).map((_, i) => (i % 2 ? 0x10 : 0)), mimeType: 'audio/L16;codec=pcm;rate=24000' };
  } });
  const spentBefore = (await service.getNarration(order.id))!.spent_micros;
  calls.length = 0;
  await Promise.all([stepCall(), stepCall()]);
  assert.equal(new Set(calls).size, calls.length, 'two steps at once never narrate the same segment');
  for (let i = 0; i < 200 && (await service.getNarration(order.id))!.status !== 'done'; i += 1) await stepCall();
  service.setFreeTierProvider(undefined);
  const done = (await service.getNarration(order.id))!;
  assert.equal(done.status, 'done');
  assert.equal(done.done, done.total);
  const providers = done.segments.map((s) => s.provider);
  assert.ok(providers.includes('chirp-free'), 'the free tier narrated part of the book');
  if (done.total > 1) assert.ok(providers.includes('gemini'), 'Gemini took over when the free tier failed');
  const freeSegments = done.segments.filter((s) => s.provider === 'chirp-free').length;
  assert.ok(freeSegments >= 1);
  assert.ok(done.spent_micros >= spentBefore, 'free segments add nothing; Gemini segments are counted');
  assert.ok(await service.chirpCharsUsed() > 0, 'free characters used this month are tracked');

  // Readers: the buyer of nothing hears the preview part; the author hears everything.
  const full = (await (await fetch(`/api/reader/catalog/${bookId}/narration`, as('admin'))).json()).narration;
  const preview = (await (await fetch(`/api/reader/catalog/${bookId}/narration`, as('reader'))).json()).narration;
  assert.equal(full.voice, 'Sulafat', 'the order that was paid');
  assert.equal(full.segments.length, done.total);
  assert.ok(preview.segments.every((p: { n: number }) => full.segments.some((f: { n: number }) => f.n === p.n)), 'readers without the book hear only preview segments');
  assert.equal(preview.access, 'preview');
  const audio = await fetch(`/api/reader/catalog/${bookId}/narration/${preview.segments[0].n}`, as('reader'));
  assert.equal(audio.headers.get('content-type'), 'audio/mpeg');
  const bytes = new Uint8Array(await audio.arrayBuffer());
  assert.ok(bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0, 'an MP3');
  // Segments outside the preview are refused (this one-chapter test book's preview is the whole book).
  const locked = full.segments.find((s: { n: number }) => !preview.segments.some((p: { n: number }) => p.n === s.n));
  if (locked) assert.equal((await fetch(`/api/reader/catalog/${bookId}/narration/${locked.n}`, as('reader'))).status, 403);
  assert.equal((await fetch(`/api/reader/catalog/${bookId}/narration/${full.segments.length + 5}`, as('reader'))).status, 403, 'unknown segments are refused');
  assert.equal((await fetch(`/api/narration/books/${bookId}/order`, json({ voice: 'Sulafat' }))).status, 409, 'one narration per book');
});

test('administrators narrate any book at no charge: no checkout, no invoice, it starts at once', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch, 'admin');
  const q = await (await fetch(`/api/narration/books/${bookId}`, as('admin'))).json();
  assert.equal(q.free, true);
  const sessionsBefore = sessions.size;
  const res = await fetch(`/api/narration/books/${bookId}/order`, json({ voice: 'Charon' }));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.deepEqual([body.free, body.url, body.narration.status, body.narration.priceCents], [true, null, 'approved', 0]);
  assert.equal(sessions.size, sessionsBefore, 'no Stripe checkout is created');
  const n = (await service.getNarration(body.narration.id))!;
  assert.equal(n.decided_by, 'test-admin-1', 'recorded as approved by the administrator');
  assert.equal((await fetch(`/api/narration/books/${bookId}/order`, json({ voice: 'Sulafat' }))).status, 409, 'still one narration per book');
});

test('a Gemini quota error pauses narration with a plain explanation instead of retrying', async () => {
  const { quotaProblem } = await import('../../artifacts/api-server/src/bookatlas/narration/service.ts');
  const google = '{"error":{"code":429,"message":"You exceeded your current quota. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 10, model: gemini-3.8-flash-tts, description: Generate content requests per day limit exceeded on Free Tier.\nPlease retry in 17h58m51.048901826s.","status":"RESOURCE_EXHAUSTED","details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}}';
  const free = quotaProblem(new Error(google))!;
  assert.equal(free.daily, true);
  assert.match(free.message, /free tier/);
  assert.match(free.message, /Set up billing/);
  const paid = quotaProblem(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded per minute. Please retry in 41.2s."}}'))!;
  assert.match(paid.message, /per-minute quota.*retry in 41s/);
  assert.equal(quotaProblem(new Error('Gemini overloaded')), null, 'other errors keep the normal retries');
});

test("on the free tier, narration waits for Google's limit to reset and continues by itself", async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch, 'admin');
  const daily = '{"error":{"code":429,"message":"Quota exceeded for metric: generate_content_free_tier_requests, limit: 10. Please retry in 17h58m51.04s.","status":"RESOURCE_EXHAUSTED","details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}}';
  quotaError = daily;
  const order = await (await fetch(`/api/narration/books/${bookId}/order`, json({ voice: 'Charon' }))).json();
  const id = order.narration.id as string;
  try {
    let r = await service.step(id);
    if (!r.resumeAt) r = await service.step(id); // a background step may have hit the limit first
    const waiting = (await service.getNarration(id))!;
    assert.equal(waiting.status, 'running', 'not failed: it is waiting');
    assert.match(waiting.error!, /continues by itself/);
    assert.equal(waiting.done, 0, 'nothing is lost or skipped');
    const wait = Date.parse(waiting.lease_until!) - Date.now();
    assert.ok(wait > 17.9 * 3600_000 && wait < 18.2 * 3600_000, 'waits as long as Google says, plus a margin');

    const before = calls.length;
    assert.deepEqual(await service.step(id), { id: null, more: false }, 'no request is made before the reset');
    assert.equal(calls.length, before);
    assert.ok(!(await service.narrationsDue()).includes(id));
    assert.ok((await service.narrationsDue(Date.now() + 19 * 3600_000)).includes(id), 'due after the reset');

    // The daily schedule: with CRON_SECRET set, only the bearer token Vercel Cron sends; nothing is due yet.
    const cron = (auth?: string) => fetch('/api/internal/narration/cron', { headers: auth ? { authorization: auth } : {} });
    delete process.env.CRON_SECRET;
    assert.equal((await cron()).status, 200);
    assert.equal((await service.getNarration(id))!.lease_until, waiting.lease_until, 'without a secret it only starts what is due, not this one');
    process.env.CRON_SECRET = 'synthetic-cron-secret-for-tests';
    assert.equal((await cron()).status, 403);
    assert.equal((await cron('Bearer wrong')).status, 403);
    const ran = await cron('Bearer synthetic-cron-secret-for-tests');
    assert.equal(ran.status, 200);

    // A narration paused the old way (before 2026-11-16) is picked up by the schedule too.
    await service.update(id, { status: 'failed', lease_until: null, error: "Paused: the Gemini API key is on Google's free tier, which allows only a few narration requests a minute." });
    assert.ok((await service.narrationsDue()).includes(id));
    assert.equal((await service.getNarration(id))!.status, 'running');

    // Once the limit has reset, it carries on from where it stopped.
    quotaError = null;
    for (let i = 0; i < 200 && (await service.getNarration(id))!.status !== 'done'; i += 1) await service.step(id);
    const done = (await service.getNarration(id))!;
    assert.equal(done.status, 'done');
    assert.equal(done.error, null);
  } finally { quotaError = null; delete process.env.CRON_SECRET; }
});

test("quota waits: Google's retry time when given, otherwise a minute or the daily reset (08:10 UTC)", async () => {
  const { quotaResumeAt, retryDelayMs } = service;
  assert.equal(retryDelayMs('Please retry in 17h58m51.04s.'), ((17 * 60 + 58) * 60 + 51.04) * 1000);
  assert.equal(retryDelayMs('retry in 41.2s'), 41_200);
  const now = new Date('2026-11-16T12:00:00Z');
  assert.equal(quotaResumeAt(new Error('per minute. Please retry in 20s.'), false, now).toISOString(), '2026-11-16T12:00:25.000Z');
  assert.equal(quotaResumeAt(new Error('per minute'), false, now).toISOString(), '2026-11-16T12:01:05.000Z');
  assert.equal(quotaResumeAt(new Error('per day'), true, now).toISOString(), '2026-11-17T08:10:00.000Z');
  assert.equal(quotaResumeAt(new Error('per day'), true, new Date('2026-11-16T03:00:00Z')).toISOString(), '2026-11-16T08:10:00.000Z');
});
