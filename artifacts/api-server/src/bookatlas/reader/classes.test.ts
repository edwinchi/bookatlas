import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classDetail, classMemory, createClass, joinClass, leaveClass, myClasses, setClassBooks } from './classes.js';
import { readerMemory } from './service.js';
import { accessFor } from '../../auth/policy.js';

const teacher = { id: 'user_teacher', email: 't@example.test', name: 'Ama Mensah', role: 'reader' as const };
const pupil = { id: 'user_pupil', email: 'p@example.test', name: 'Kofi Boateng', role: 'reader' as const };
const other = { id: 'user_other', email: 'o@example.test', name: 'Lina Smit', role: 'reader' as const };
const titles = async (id: string) => ({ 'book-a': 'Book A', 'book-b': 'Book B' } as Record<string, string>)[id] ?? null;

test('schools and teams: create, join with the code, reading list, progress for the teacher only', async () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const c = await createClass(teacher, { name: '  Year 5 <b>readers</b> ', kind: 'class' });
  assert.equal(c.name, 'Year 5 readers');
  assert.match(c.inviteCode!, /^[A-Z2-9]{8}$/);
  await assert.rejects(joinClass(pupil, { code: 'NOPE1234' }, titles), /No class has this invite code/);
  const joined = await joinClass(pupil, { code: c.inviteCode!.toLowerCase() }, titles);
  assert.equal(joined.role, 'member');
  assert.equal('inviteCode' in joined, false, 'members do not see the invite code');
  await assert.rejects(setClassBooks(pupil, c.id, { books: ['book-a'] }, titles), /Only the teacher/);
  const list = await setClassBooks(teacher, c.id, { books: ['book-a', 'book-b', 'unknown', 'book-a'] }, titles);
  assert.deepEqual(list.books.map((b) => b.id), ['book-a', 'book-b']);
  // The pupil read half of book A this week.
  readerMemory().progress.set('user_pupil:book-a', { user_id: 'user_pupil', book_id: 'book-a', chapter_index: 3, paragraph_index: 0, progress_percent: 50, device: null, updated_at: now.toISOString() });
  readerMemory().sessions.push({ id: 's1', user_id: 'user_pupil', book_id: 'book-a', started_at: '2026-11-24T10:00:00Z', seconds: 1200, paragraphs: 10, words: 3000, device: null });
  const view = await classDetail(teacher, c.id, titles, now);
  assert.equal(view.rows.length, 1);
  assert.deepEqual(view.rows[0]!.books, { 'book-a': 50, 'book-b': 0 });
  assert.equal(view.rows[0]!.weekMinutes, 20);
  assert.equal(view.rows[0]!.name, 'Kofi B.');
  assert.deepEqual(view.totals, { members: 1, weekMinutes: 20, averageProgress: 25, activeThisWeek: 1 });
  const own = await classDetail(pupil, c.id, titles, now);
  assert.equal(own.rows.length, 1);
  assert.equal(own.rows[0]!.userId, 'user_pupil');
  assert.equal(own.totals, null);
  await assert.rejects(classDetail(other, c.id, titles, now), /Class not found/);
  assert.equal((await myClasses(pupil, titles)).length, 1);
});

test('schools and teams: leaving, removing and closing', async () => {
  const c = await createClass(teacher, { name: 'Book club', kind: 'team' });
  await joinClass(pupil, { code: c.inviteCode }, titles);
  await joinClass(other, { code: c.inviteCode }, titles);
  await assert.rejects(leaveClass(pupil, c.id, 'user_other'), /Only the teacher/);
  assert.deepEqual(await leaveClass(teacher, c.id, 'user_other'), { closed: false });
  assert.deepEqual(await leaveClass(pupil, c.id), { closed: false });
  assert.deepEqual(await leaveClass(teacher, c.id), { closed: true });
  assert.equal(classMemory().classes.some((x) => x.id === c.id), false);
  assert.equal(classMemory().members.some((m) => m.class_id === c.id), false);
});

test('schools and teams: routes are for signed-in readers', () => {
  const id = '0b3b7c1e-1d2a-4f5e-9a8b-123456789abc';
  assert.equal(accessFor('GET', '/api/reader/classes'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/classes/join'), 'reader');
  assert.equal(accessFor('GET', `/api/reader/classes/${id}`), 'reader');
  assert.equal(accessFor('PUT', `/api/reader/classes/${id}/books`), 'reader');
  assert.equal(accessFor('DELETE', `/api/reader/classes/${id}/members/me`), 'reader');
  assert.equal(accessFor('DELETE', `/api/reader/classes/${id}`), 'admin');
});
