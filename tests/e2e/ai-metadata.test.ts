import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';

after(async () => { await closeSharedTestServer(); });

const post = (body: unknown) => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': 'reader' }, body: JSON.stringify(body) });

test('New eBook form: details are suggested from the manuscript; without an AI key the book\'s own pages are used', async () => {
  const { fetch } = await getSharedTestServer();
  assert.equal((await fetch('/api/ai/book-metadata', post({ excerpt: 'Too short.', headings: [] }))).status, 400);
  const excerpt = `SCROLL OF SOVEREIGNTY\nHow to Reclaim Your Mind\nby\nApehgong Edwin Chi\nCopyright © 2026 Apehgong Edwin Chi\nAll rights reserved.\n${'A chapter about the field and the mind. '.repeat(20)}`;
  const res = await fetch('/api/ai/book-metadata', post({ excerpt, headings: ['Dedication', 'PART ONE: The Scroll'], known: { title: 'Scroll of Sovereignty', language: 'English' } }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.source, 'book', 'tests run without AI keys');
  assert.deepEqual(body.suggestion, { copyrightYear: 2026, copyrightHolder: 'Apehgong Edwin Chi', title: 'Scroll of Sovereignty', author: 'Apehgong Edwin Chi', language: 'English' });
});

test('many authors at once: parallel suggestions and parallel uploads all succeed', async () => {
  const { fetch } = await getSharedTestServer();
  const excerpt = `A BOOK\nby\nAda Writer\nCopyright © 2026 Ada Writer\n${'Text of the book about the mind. '.repeat(20)}`;
  const answers = await Promise.all(Array.from({ length: 10 }, () => fetch('/api/ai/book-metadata', post({ excerpt, headings: [] }))));
  assert.deepEqual(answers.map((r) => r.status), Array(10).fill(200), 'every author gets an answer');

  const { epub2 } = await import('../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts');
  const json = (body: unknown) => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': 'reader' }, body: JSON.stringify(body) });
  const upload = async (n: number) => {
    const file = epub2(5);
    const intake = {
      title: `Parallel Book ${n}`, author: 'Ada Writer', language: 'English', description: 'A book uploaded at the same time as others. '.repeat(6),
      categories: ['Spiritual Healing & Alignment'], keywords: ['parallel'], copyrightHolder: 'Test Press', copyrightYear: 2026,
      price: 0, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
    };
    const s = await (await fetch('/api/ebook-submissions', json({ intake, fileName: `parallel-${n}.epub`, size: file.byteLength }))).json();
    await Promise.all(Array.from({ length: s.upload.parts }, (_, part) => fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, {
      method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'reader' },
      body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes),
    })));
    return (await (await fetch(`/api/ebook-submissions/${s.id}/prepare`, json({}))).json()) as { id: string; status: string; intake: { title: string } };
  };
  const done = await Promise.all([1, 2, 3].map(upload));
  assert.deepEqual(done.map((d) => d.status), ['ready', 'ready', 'ready'], 'three books uploaded and prepared at the same time');
  assert.equal(new Set(done.map((d) => d.id)).size, 3, 'each upload is its own submission');
  assert.deepEqual(done.map((d) => d.intake.title), ['Parallel Book 1', 'Parallel Book 2', 'Parallel Book 3'], 'no upload mixes with another');
});
