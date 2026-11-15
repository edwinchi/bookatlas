import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';

// Reader Phase 3 (cycle 10): achievements, shared notes, popular highlights, reports and reading groups.
after(async () => { await closeSharedTestServer(); });

const send = (body: unknown, role = 'reader', method = 'POST') => ({ method, headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string, method = 'GET') => ({ method, headers: { 'x-test-role': role } });
type Fetch = (path: string, init?: RequestInit) => Promise<Response>;

async function publishBook(fetch: Fetch, title: string, price: number) {
  const file = epub2(6);
  const intake = {
    title, author: 'Social Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const s = await (await fetch('/api/ebook-submissions', send({ intake, fileName: 's.epub', size: file.byteLength }, 'admin'))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'admin' }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${s.id}/prepare`, send({}, 'admin'));
  return (await (await fetch(`/api/ebook-submissions/${s.id}/publish`, send({}, 'admin'))).json()).bookId as string;
}

test('shared notes and popular highlights: names are first name and initial, quotes come from the book, three readers make a passage popular', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch, 'The Shared Codex', 0);
  const service = await import('../../artifacts/api-server/src/bookatlas/reader/service.ts');
  const add = async (role: string, body: Record<string, unknown>) => (await fetch('/api/reader/annotations', send({ bookId, ...body }, role))).json();

  const note = await add('reader', { kind: 'note', chapterIndex: 1, paragraphIndex: 2, excerpt: 'INVENTED QUOTE', note: 'This changed how I breathe.' });
  const bookmark = await add('reader', { kind: 'bookmark', chapterIndex: 1, paragraphIndex: 0 });
  const share = (id: string, shared: boolean, role = 'reader') => fetch(`/api/reader/annotations/${id}/share`, send({ bookId, shared }, role, 'PATCH'));
  assert.equal((await share(bookmark.id, true)).status, 400, 'bookmarks stay private');
  assert.equal((await share(note.id, true, 'admin')).status, 404, 'only the writer can share it');
  const shared = await (await share(note.id, true)).json();
  assert.equal(shared.shared, true);
  assert.equal(shared.display_name, 'Sanne D.', 'first name and initial only');
  assert.notEqual(shared.excerpt, 'INVENTED QUOTE', 'the quote is taken from the book');

  // Popular: two readers are not enough, three are; nobody is named.
  await add('reader', { kind: 'highlight', chapterIndex: 1, paragraphIndex: 4 });
  await add('admin', { kind: 'highlight', chapterIndex: 1, paragraphIndex: 4 });
  const social = async (role = 'author', chapter = 1) => (await fetch(`/api/reader/social/${bookId}/${chapter}`, as(role))).json();
  assert.deepEqual((await social()).popular, []);
  await service.addAnnotation('another-reader', { bookId, kind: 'highlight', chapterIndex: 1, paragraphIndex: 4 });
  const view = await social();
  assert.deepEqual(view.popular, [{ paragraphIndex: 4, readers: 3 }]);
  assert.equal(view.notes.length, 1);
  assert.deepEqual([view.notes[0].name, view.notes[0].note, view.notes[0].mine], ['Sanne D.', 'This changed how I breathe.', false]);
  assert.equal(JSON.stringify(view).includes('test-reader-1'), false, 'no account ids leak');
  assert.equal((await fetch(`/api/reader/social/${bookId}/1`, as('unauthenticated'))).status, 401);

  // Reports: three different readers hide it; an administrator restores it.
  const reportIt = (role: string) => fetch('/api/reader/reports', send({ kind: 'annotation', targetId: note.id, reason: 'spam' }, role));
  assert.equal((await fetch('/api/reader/reports', send({ kind: 'annotation', targetId: bookmark.id }, 'author'))).status, 404, 'private items cannot be reported');
  assert.equal((await reportIt('author')).status, 201);
  assert.equal((await reportIt('author')).status, 201, 'reporting twice counts once');
  await reportIt('admin');
  assert.equal((await social()).notes.length, 1, 'two reports do not hide it');
  const social2 = await import('../../artifacts/api-server/src/bookatlas/reader/social.ts');
  await social2.report('third-reporter', 'annotation', note.id, null, async () => true);
  assert.equal((await social()).notes.length, 0, 'three reports hide it');
  assert.equal((await fetch('/api/manager/reader-reports', as('reader'))).status, 403);
  const items = (await (await fetch('/api/manager/reader-reports', as('admin'))).json()).items;
  assert.deepEqual([items[0].kind, items[0].reports, items[0].hidden, items[0].text], ['annotation', 3, true, 'This changed how I breathe.']);
  assert.equal((await fetch(`/api/manager/reader-reports/annotation/${note.id}/restore`, as('admin', 'POST'))).status, 200);
  assert.equal((await social()).notes.length, 1);

  // Unsharing removes it.
  await share(note.id, false);
  assert.equal((await social()).notes.length, 0);
});

test('readers without the book see shared notes only on the text they may read', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch, 'The Paid Codex', 4.99);
  const note = await (await fetch('/api/reader/annotations', send({ bookId, kind: 'note', chapterIndex: 1, paragraphIndex: 3, note: 'The ending is wonderful' }, 'admin'))).json();
  assert.equal((await fetch(`/api/reader/annotations/${note.id}/share`, send({ bookId, shared: true }, 'admin', 'PATCH'))).status, 200);
  const { chapterSocial } = await import('../../artifacts/api-server/src/bookatlas/reader/social.ts');
  const para = (n: number) => ({ title: 'c', content: Array.from({ length: n }, () => 'text') });
  assert.equal((await chapterSocial('viewer', bookId, 1, [para(9), para(9)])).notes.length, 1, 'whole book: visible');
  assert.deepEqual(await chapterSocial('viewer', bookId, 1, [para(9), para(2)]), { popular: [], notes: [] }, 'preview ends before it');
  assert.deepEqual(await chapterSocial('viewer', bookId, 1, [para(9)]), { popular: [], notes: [] }, 'chapter not in the preview');
});

test('reading groups: create, invite, join, discuss per chapter, moderate, leave', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch, 'The Club Codex', 0);
  assert.equal((await fetch('/api/reader/groups', send({ bookId: 'atlas-ebook-00000000', name: 'x' }))).status, 404);
  const created = await (await fetch('/api/reader/groups', send({ bookId, name: 'Zwolle <b>book</b> club' }))).json();
  assert.equal(created.name, 'Zwolle book club', 'markup is removed');
  assert.match(created.inviteCode, /^[A-Z2-9]{10}$/);
  assert.equal((await fetch(`/api/reader/groups/${created.id}`, as('author'))).status, 404, 'not visible before joining');
  assert.equal((await fetch('/api/reader/groups/join', send({ code: 'WRONGCODE1' }, 'author'))).status, 404);
  const joined = await (await fetch('/api/reader/groups/join', send({ code: created.inviteCode.toLowerCase() }, 'author'))).json();
  assert.deepEqual([joined.id, joined.members, joined.role], [created.id, 2, 'member']);
  assert.equal((await (await fetch('/api/reader/groups/join', send({ code: created.inviteCode }, 'author'))).json()).members, 2, 'joining twice is harmless');

  const post = (body: Record<string, unknown>, role = 'author') => fetch(`/api/reader/groups/${created.id}/posts`, send(body, role));
  assert.equal((await post({ body: '  ' })).status, 400);
  const p1 = await (await post({ body: 'Chapter 3 surprised me!', chapterIndex: 2 })).json();
  await post({ body: 'Welcome, everyone.', chapterIndex: null }, 'reader');
  const detail = await (await fetch(`/api/reader/groups/${created.id}`, as('author'))).json();
  assert.deepEqual(detail.memberNames.map((m: { name: string; role: string }) => [m.name, m.role]), [['Sanne D.', 'owner'], ['Ada W.', 'member']]);
  assert.equal(detail.posts.length, 2);
  assert.equal(detail.posts.find((p: { id: string }) => p.id === p1.id).chapterIndex, 2);
  assert.equal((await (await fetch(`/api/reader/groups?bookId=${bookId}`, as('author'))).json()).groups.length, 1);

  // The owner may remove any post; members only their own.
  const welcome = detail.posts.find((p: { body: string }) => p.body === 'Welcome, everyone.');
  assert.equal((await fetch(`/api/reader/groups/${created.id}/posts/${welcome.id}`, as('author', 'DELETE'))).status, 403);
  assert.equal((await fetch(`/api/reader/groups/${created.id}/posts/${p1.id}`, as('reader', 'DELETE'))).status, 204);

  // Achievements: the book club badge; the goal comes from the reader's settings.
  await fetch('/api/reader/preferences', send({ dailyGoalMinutes: 30 }, 'author', 'PUT'));
  await fetch('/api/reader/sessions', send({ bookId, seconds: 120, words: 400 }, 'author'));
  const a = await (await fetch('/api/reader/achievements', as('author'))).json();
  const byId = Object.fromEntries(a.achievements.map((x: { id: string }) => [x.id, x]));
  assert.equal(byId['book-club'].unlocked, true);
  assert.equal(byId['first-pages'].unlocked, true);
  assert.equal(byId['streak-7'].unlocked, false);
  assert.deepEqual(a.goal, { minutes: 30, today: 2, met: false });
  assert.ok(a.points >= 15);

  // Leaving; when the owner leaves, the group is deleted.
  assert.deepEqual(await (await fetch(`/api/reader/groups/${created.id}/membership`, as('author', 'DELETE'))).json(), { deleted: false });
  assert.deepEqual(await (await fetch(`/api/reader/groups/${created.id}/membership`, as('reader', 'DELETE'))).json(), { deleted: true });
  assert.equal((await fetch(`/api/reader/groups/${created.id}`, as('reader'))).status, 404);
});
