import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';

after(async () => { await closeSharedTestServer(); });

const send = (body: unknown, role = 'reader', method = 'POST') => ({ method, headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string, method = 'GET') => ({ method, headers: { 'x-test-role': role } });

async function publishBook(fetch: (path: string, init?: RequestInit) => Promise<Response>) {
  const file = epub2(5);
  const intake = {
    title: 'The Synced Codex', author: 'Sync Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 0, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const s = await (await fetch('/api/ebook-submissions', send({ intake, fileName: 's.epub', size: file.byteLength }, 'admin'))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'admin' }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${s.id}/prepare`, send({}, 'admin'));
  return (await (await fetch(`/api/ebook-submissions/${s.id}/publish`, send({}, 'admin'))).json()).bookId as string;
}

test('reader sync: place, highlights, bookmarks, notes, search, settings and stats follow the account', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch);

  assert.equal((await fetch(`/api/reader/state/${bookId}`, as('unauthenticated'))).status, 401);
  assert.deepEqual(await (await fetch(`/api/reader/state/${bookId}`, as('reader'))).json(), { progress: null, annotations: [] });

  // Progress: last write wins; an older write from a slow device is ignored.
  assert.equal((await fetch('/api/reader/progress/no-such-book', send({ chapterIndex: 0, paragraphIndex: 0, progressPercent: 0 }, 'reader', 'PUT'))).status, 404);
  assert.equal((await fetch(`/api/reader/progress/${bookId}`, send({ chapterIndex: -1, paragraphIndex: 0, progressPercent: 5 }, 'reader', 'PUT'))).status, 400);
  const now = new Date().toISOString();
  await fetch(`/api/reader/progress/${bookId}`, send({ chapterIndex: 2, paragraphIndex: 7, progressPercent: 40, device: 'phone', at: now }, 'reader', 'PUT'));
  const stale = await (await fetch(`/api/reader/progress/${bookId}`, send({ chapterIndex: 0, paragraphIndex: 1, progressPercent: 3, at: new Date(Date.now() - 60_000).toISOString() }, 'reader', 'PUT'))).json();
  assert.deepEqual([stale.chapter_index, stale.paragraph_index, stale.device], [2, 7, 'phone'], 'the newer place is kept');

  // Highlights, bookmarks, notes.
  const add = (body: Record<string, unknown>, role = 'reader') => fetch('/api/reader/annotations', send({ bookId, ...body }, role));
  const hl = await (await add({ kind: 'highlight', color: 'green', chapterIndex: 1, paragraphIndex: 3, excerpt: 'Calm is a skill you can practise.' })).json();
  const again = await (await add({ kind: 'highlight', color: 'blue', chapterIndex: 1, paragraphIndex: 3, excerpt: 'Calm is a skill you can practise.' })).json();
  assert.equal(again.id, hl.id, 'highlighting the same paragraph again updates it');
  assert.equal(again.color, 'blue');
  await add({ kind: 'bookmark', chapterIndex: 2, paragraphIndex: 0, excerpt: 'Chapter three begins' });
  assert.equal((await add({ kind: 'note', chapterIndex: 2, paragraphIndex: 4, note: '   ' })).status, 400, 'an empty note is refused');
  const note = await (await add({ kind: 'note', chapterIndex: 2, paragraphIndex: 4, excerpt: 'Breath', note: 'Try the <b>4-7-8</b> breathing tonight' })).json();
  assert.equal((await add({ kind: 'sticker', chapterIndex: 0, paragraphIndex: 0 })).status, 400);

  const state = await (await fetch(`/api/reader/state/${bookId}`, as('reader'))).json();
  assert.deepEqual(state.annotations.map((a: { kind: string }) => a.kind).sort(), ['bookmark', 'highlight', 'note']);
  assert.deepEqual(state.progress.chapter_index, 2);
  assert.deepEqual(await (await fetch(`/api/reader/state/${bookId}`, as('admin'))).json(), { progress: null, annotations: [] }, 'another account sees nothing');

  assert.equal((await fetch(`/api/reader/annotations/${hl.id}`, send({ note: 'mine' }, 'admin', 'PATCH'))).status, 404, 'cannot edit another account\'s highlight');
  const edited = await (await fetch(`/api/reader/annotations/${hl.id}`, send({ note: 'Share with my study group', color: 'purple' }, 'reader', 'PATCH'))).json();
  assert.deepEqual([edited.note, edited.color], ['Share with my study group', 'purple']);

  const found = await (await fetch('/api/reader/annotations?q=breathing', as('reader'))).json();
  assert.deepEqual(found.annotations.map((a: { id: string }) => a.id), [note.id], 'notes are searchable across books');
  assert.equal((await (await fetch('/api/reader/annotations?q=study%20group', as('reader'))).json()).annotations[0].id, hl.id);

  assert.equal((await fetch(`/api/reader/annotations/${note.id}`, as('admin', 'DELETE'))).status, 404);
  assert.equal((await fetch(`/api/reader/annotations/${note.id}`, as('reader', 'DELETE'))).status, 204);

  // Settings: only known keys and sane values are kept.
  const prefs = await (await fetch('/api/reader/preferences', send({ theme: 'sepia', fontSize: 22, lineHeight: 1.8, fontFamily: 'serif', evil: '<script>', ttsSpeed: 9 }, 'reader', 'PUT'))).json();
  assert.deepEqual(prefs.settings, { theme: 'sepia', fontFamily: 'serif', fontSize: 22, lineHeight: 1.8 });
  assert.deepEqual((await (await fetch('/api/reader/preferences', as('reader'))).json()).settings.theme, 'sepia');

  // Sessions and statistics.
  assert.equal((await fetch('/api/reader/sessions', send({ bookId, seconds: 2 }))).status, 400, 'very short sessions are not counted');
  await fetch('/api/reader/sessions', send({ bookId, seconds: 600, paragraphs: 30, words: 2_400 }));
  await fetch('/api/reader/sessions', send({ bookId, seconds: 120, paragraphs: 5, words: 999_999 }));
  const stats = await (await fetch('/api/reader/stats', as('reader'))).json();
  assert.equal(stats.totalMinutes, 12);
  assert.equal(stats.words, 2_400 + 3_000, 'implausible word counts are capped at 1,500 a minute');
  assert.equal(stats.streakDays, 1);
  assert.equal(stats.booksStarted, 1);
  assert.equal(stats.last30.at(-1).minutes, 12);

  const exported = await (await fetch('/api/account/export', as('reader'))).json();
  const reader = exported.purchases.find((p: { record?: string }) => p.record === 'reader');
  assert.ok(reader && reader.annotations.length === 2 && reader.sessions.length === 2, 'reader data is in the data export');
});
