import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;
const WORKER = 'synthetic-ebook-worker-token-for-tests-0123456789';
process.env.EBOOK_WORKER_TOKEN = WORKER;

import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2, frontCover } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';

after(async () => {
  delete process.env.EBOOK_WORKER_TOKEN;
  await closeSharedTestServer();
});

const intake = {
  title: 'The Test Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
  categories: ['Spiritual Healing & Alignment', 'Mind Mastery & Quantum Awakening'], keywords: ['healing', 'alignment'],
  copyrightHolder: 'Test Press', copyrightYear: 2026, ebookIsbn: '978-1-326-15795-1', price: 0,
  rightsConfirmed: true, aiContent: 'assisted', wantsPrint: false,
};
const json = (body: unknown, role = 'reader') => ({
  method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body),
});
const as = (role: string) => ({ headers: { 'x-test-role': role } });

test('an author submission is prepared, checked, published and readable', async () => {
  const { fetch } = await getSharedTestServer();
  const file = epub2(5);

  const missing = await fetch('/api/ebook-submissions', json({ intake: { ...intake, description: 'short' }, fileName: 'book.epub', size: file.byteLength }));
  assert.equal(missing.status, 422);
  assert.ok((await missing.json()).fields.description);

  const created = await fetch('/api/ebook-submissions', json({ intake, fileName: 'book.epub', size: file.byteLength }));
  assert.equal(created.status, 201);
  const submission = await created.json();
  assert.equal(submission.status, 'uploading');
  for (let part = 0; part < submission.upload.parts; part += 1) {
    const bytes = file.subarray(part * submission.partBytes, (part + 1) * submission.partBytes);
    const put = await fetch(`/api/ebook-submissions/${submission.id}/upload/${part}`, {
      method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'reader' }, body: bytes,
    });
    assert.equal(put.status, 204);
  }

  const prepared = await (await fetch(`/api/ebook-submissions/${submission.id}/prepare`, json({}))).json();
  assert.equal(prepared.status, 'checking', JSON.stringify(prepared.report?.findings));
  assert.equal(prepared.report.summary.errors, 0);
  assert.ok(prepared.report.rounds[0].changes.some((c: { rule: string }) => c.rule === 'cover-front-only'));

  // The EPUBCheck worker: token required, then claim, download, report.
  assert.equal((await fetch('/api/internal/ebook-checks/claim', { method: 'POST' })).status, 401);
  const claim = await fetch('/api/internal/ebook-checks/claim', { method: 'POST', headers: { authorization: `Bearer ${WORKER}` } });
  assert.equal(claim.status, 200);
  const job = await claim.json();
  assert.equal(job.id, submission.id);
  const parts: Uint8Array[] = [];
  for (let part = 0; part < job.parts; part += 1) {
    parts.push(new Uint8Array(await (await fetch(`/api/internal/ebook-checks/${job.id}/parts/${part}`, { headers: { authorization: `Bearer ${WORKER}` } })).arrayBuffer()));
  }
  const checked = Buffer.concat(parts);
  assert.equal(createHash('sha256').update(checked).digest('hex'), job.sha256);
  const result = await fetch(`/api/internal/ebook-checks/${job.id}/result`, {
    method: 'POST', headers: { authorization: `Bearer ${WORKER}`, 'content-type': 'application/json' },
    body: JSON.stringify({ sha256: job.sha256, messages: [] }),
  });
  assert.deepEqual(await result.json(), { status: 'ready' });

  const manifest = await (await fetch(`/api/ebook-submissions/${submission.id}/files/epub`, as('reader'))).json();
  assert.equal(manifest.sha256, job.sha256);

  const published = await (await fetch(`/api/ebook-submissions/${submission.id}/publish`, json({}, 'admin'))).json();
  assert.equal(published.status, 'published');
  const bookId = published.bookId;
  assert.match(bookId, /^atlas-ebook-[0-9a-f]{8}$/);

  const catalog = await (await fetch('/api/catalog/search?genre=Spiritual%20Healing%20%26%20Alignment')).json();
  const card = catalog.books.find((b: { id: string }) => b.id === bookId);
  assert.ok(card, 'listed in its new category');
  assert.equal(card.sampleChapters, undefined, 'lists carry cards, not whole books');
  const { book } = await (await fetch(`/api/catalog/books/${bookId}`)).json();
  assert.equal(book.hasReaderContent, true);
  assert.equal(book.sampleChapters.at(-1).title, 'Chapter 1: Welcome', 'the sample runs up to the first full chapter');
  assert.ok(book.sampleChapters.every((c: { figures?: unknown }) => !c.figures), 'the catalog sample is text; the reader loads images');
  const categories = await (await fetch('/api/categories')).json();
  assert.ok(categories.allCategories.includes('Spiritual Healing & Alignment'));

  const content = await (await fetch(`/api/reader/catalog/${bookId}/content`, as('reader'))).json();
  const chapter = content.chapters.find((c: { title: string }) => c.title === 'Chapter 1: Welcome');
  assert.ok(chapter.content.includes('3. Matthew 7:13'));
  const cover = await fetch(`/api/catalog/covers/${bookId}.jpg`);
  assert.equal(cover.headers.get('content-type'), 'image/jpeg');

  // Hardcopy links, added after publishing, show on the book page.
  const links = (body: unknown) => fetch(`/api/ebook-submissions/${submission.id}/print-links`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-test-role': 'reader' }, body: JSON.stringify(body) });
  assert.equal((await links({ amazon: 'https://evil.example/amazon.com/dp/1' })).status, 422);
  assert.equal((await links({ lulu: 'http://www.lulu.com/shop/x' })).status, 422, 'https only');
  const saved = await (await links({ amazon: 'https://www.amazon.nl/dp/B0TEST1234#reviews', lulu: 'https://www.lulu.com/shop/test-codex/paperback' })).json();
  assert.deepEqual(saved.printLinks, { amazon: 'https://www.amazon.nl/dp/B0TEST1234', lulu: 'https://www.lulu.com/shop/test-codex/paperback' });
  const page = await (await fetch(`/api/catalog/books/${bookId}`)).json();
  assert.deepEqual(page.book.printLinks, saved.printLinks);
});

test('the author fixes a small cover by uploading a larger one, enlarging it, or going back', async () => {
  const { fetch } = await getSharedTestServer();
  const file = epub2(5);
  const submission = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'cover.epub', size: file.byteLength }))).json();
  for (let part = 0; part < submission.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${submission.id}/upload/${part}`, {
      method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'reader' },
      body: file.subarray(part * submission.partBytes, (part + 1) * submission.partBytes),
    });
  }
  const prepared = await (await fetch(`/api/ebook-submissions/${submission.id}/prepare`, json({}))).json();
  assert.equal(prepared.report.findings.find((f: { rule: string }) => f.rule === 'cover-size').severity, 'warning');
  const coverPath = `/api/ebook-submissions/${submission.id}/cover`;
  const put = (bytes: Uint8Array, role = 'reader') => fetch(coverPath, { method: 'PUT', headers: { 'content-type': 'image/png', 'x-test-role': role }, body: bytes });

  const wide = await put(frontCover(1600, 1000));
  assert.equal(wide.status, 400);
  assert.match((await wide.json()).error, /front cover only/);

  const replaced = await (await put(frontCover(1600, 2560))).json();
  assert.deepEqual(replaced.coverFix, { kind: 'upload', width: 1600, height: 2560 });
  assert.equal(replaced.report.cover.height, 2560);
  assert.ok(!replaced.report.findings.some((f: { rule: string }) => f.rule === 'cover-size'));

  const enlarged = await (await fetch(`${coverPath}/enlarge`, json({}))).json();
  assert.deepEqual(enlarged.coverFix, { kind: 'enlarge' });
  assert.equal(enlarged.report.cover.height, 2560);

  const original = await (await fetch(coverPath, { method: 'DELETE', headers: { 'x-test-role': 'reader' } })).json();
  assert.equal(original.coverFix, null);
  assert.equal(original.report.cover.height, 1130);
});

test('a paid book: everyone gets the preview, the author and admins the whole book', async () => {
  const { fetch } = await getSharedTestServer();
  const file = epub2(5);
  const submission = await (await fetch('/api/ebook-submissions', json({ intake: { ...intake, title: 'The Paid Codex', price: 4.99 }, fileName: 'paid.epub', size: file.byteLength }))).json();
  for (let part = 0; part < submission.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${submission.id}/upload/${part}`, {
      method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'reader' },
      body: file.subarray(part * submission.partBytes, (part + 1) * submission.partBytes),
    });
  }
  await fetch(`/api/ebook-submissions/${submission.id}/prepare`, json({}));
  const worker = { authorization: `Bearer ${WORKER}` };
  // Other tests may have left submissions in the queue; validate them all until this one is done.
  for (let done = false; !done;) {
    const claim = await fetch('/api/internal/ebook-checks/claim', { method: 'POST', headers: worker });
    assert.equal(claim.status, 200, 'this submission is waiting for validation');
    const job = await claim.json();
    await fetch(`/api/internal/ebook-checks/${job.id}/result`, { method: 'POST', headers: { ...worker, 'content-type': 'application/json' }, body: JSON.stringify({ sha256: job.sha256, messages: [] }) });
    done = job.id === submission.id;
  }
  const { bookId } = await (await fetch(`/api/ebook-submissions/${submission.id}/publish`, json({}, 'admin'))).json();

  const contentAs = async (role: string) => (await fetch(`/api/reader/catalog/${bookId}/content`, as(role))).json();
  const visitor = await contentAs('unauthenticated');
  assert.equal(visitor.access, 'preview');
  assert.ok(visitor.chapters.length >= 1);
  assert.equal((await contentAs('admin')).access, 'full');
  assert.equal((await contentAs('reader')).access, 'full', 'test-reader-1 submitted it, so it is their book');
});

test('the author replaces the EPUB with a corrected one until the book is published', async () => {
  const { fetch } = await getSharedTestServer();
  const send = async (id: string, upload: { parts: number }, partBytes: number, bytes: Uint8Array) => {
    for (let part = 0; part < upload.parts; part += 1) {
      const put = await fetch(`/api/ebook-submissions/${id}/upload/${part}`, {
        method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'reader' },
        body: bytes.subarray(part * partBytes, (part + 1) * partBytes),
      });
      assert.equal(put.status, 204);
    }
    return (await fetch(`/api/ebook-submissions/${id}/prepare`, json({}))).json();
  };
  const first = epub2(5);
  const submission = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'draft.epub', size: first.byteLength }))).json();
  const prepared = await send(submission.id, submission.upload, submission.partBytes, first);
  assert.equal(prepared.report.cover.height, 1130);

  const corrected = epub2(6);
  const restarted = await (await fetch(`/api/ebook-submissions/${submission.id}/reupload`, json({ intake: { ...intake, title: 'The Test Codex, Revised' }, fileName: 'corrected.epub', size: corrected.byteLength }))).json();
  assert.equal(restarted.status, 'uploading');
  assert.equal(restarted.report, null, 'the old report is gone');
  assert.equal(restarted.upload.fileName, 'corrected.epub');
  const again = await send(submission.id, restarted.upload, restarted.partBytes, corrected);
  assert.equal(again.report.cover.height, 1356, 'prepared from the corrected file');
  assert.equal(again.intake.title, 'The Test Codex, Revised');
  assert.equal(again.report.summary.errors, 0);

  // Once published, the EPUB can no longer be swapped.
  const worker = { authorization: `Bearer ${WORKER}` };
  for (let done = false; !done;) {
    const claim = await fetch('/api/internal/ebook-checks/claim', { method: 'POST', headers: worker });
    assert.equal(claim.status, 200);
    const job = await claim.json();
    await fetch(`/api/internal/ebook-checks/${job.id}/result`, { method: 'POST', headers: { ...worker, 'content-type': 'application/json' }, body: JSON.stringify({ sha256: job.sha256, messages: [] }) });
    done = job.id === submission.id;
  }
  const published = await (await fetch(`/api/ebook-submissions/${submission.id}/publish`, json({}, 'admin'))).json();
  assert.equal(published.status, 'published');
  const late = await fetch(`/api/ebook-submissions/${submission.id}/reupload`, json({ intake, fileName: 'late.epub', size: corrected.byteLength }));
  assert.equal(late.status, 409);

  // A published book gets a new version: a new submission that replaces it under the same id.
  const before = (await (await fetch(`/api/catalog/books/${published.bookId}`)).json()).book;
  const second = epub2(5);
  const version = await (await fetch(`/api/ebook-submissions/${submission.id}/new-version`, json({ intake: { ...intake, title: 'The Test Codex, Second Edition' }, fileName: 'second.epub', size: second.byteLength }))).json();
  assert.equal(version.status, 'uploading');
  assert.equal(version.replacesBookId, published.bookId);
  const preparedVersion = await send(version.id, version.upload, version.partBytes, second);
  assert.equal(preparedVersion.report.summary.errors, 0);
  for (let done = false; !done;) {
    const claim = await fetch('/api/internal/ebook-checks/claim', { method: 'POST', headers: worker });
    assert.equal(claim.status, 200);
    const job = await claim.json();
    await fetch(`/api/internal/ebook-checks/${job.id}/result`, { method: 'POST', headers: { ...worker, 'content-type': 'application/json' }, body: JSON.stringify({ sha256: job.sha256, messages: [] }) });
    done = job.id === version.id;
  }
  assert.equal((await fetch(`/api/catalog/books/${published.bookId}`).then((r) => r.json())).book.title, before.title, 'the live book is unchanged until the new version is published');
  const republished = await (await fetch(`/api/ebook-submissions/${version.id}/publish`, json({}, 'admin'))).json();
  assert.equal(republished.bookId, published.bookId, 'same book id');
  const after = (await (await fetch(`/api/catalog/books/${published.bookId}`)).json()).book;
  assert.equal(after.title, 'The Test Codex, Second Edition');
  assert.equal(after.publishDate, before.publishDate, 'the first publication date stays');
  const reader = await (await fetch(`/api/reader/catalog/${published.bookId}/content`, as('reader'))).json();
  assert.equal(reader.access, 'full', 'the author still reads the whole book');
});

test('store feedback is matched to rules and makes them blocking', async () => {
  const { fetch } = await getSharedTestServer();
  const lulu = await (await fetch('/api/ebook-prep/feedback', json({ store: 'Lulu', message: 'Copyright year mismatch ~ Copyright year entered in the metadata does not match copyright year in the interior file.' }, 'admin'))).json();
  assert.deepEqual(lulu.matched_rules, ['copyright-year']);
  const unknown = await (await fetch('/api/ebook-prep/feedback', json({ store: 'Kobo', message: 'Interior bleed is inconsistent across spreads.' }, 'admin'))).json();
  assert.deepEqual(unknown.matched_rules, []);
  const overview = await (await fetch('/api/ebook-prep/feedback', as('admin'))).json();
  assert.equal(overview.rules.find((r: { id: string }) => r.id === 'copyright-year').blocking, true);
  assert.ok(overview.needsNewRule.some((f: { store: string }) => f.store === 'Kobo'));
});
