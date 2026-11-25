import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerQuiz, classDetail, classMemory, classReport, createClass, dueDate, joinClass, leaveClass, myClasses, publishQuiz, removeQuiz, setClassBooks } from './classes.js';
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
  assert.deepEqual(view.totals, { quizAverage: null, members: 1, weekMinutes: 20, averageProgress: 25, activeThisWeek: 1 });
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

test('assignments: due dates on the reading list, only for books on it and only real dates', async () => {
  const c = await createClass(teacher, { name: 'Due dates', kind: 'class' });
  const r = await setClassBooks(teacher, c.id, { books: ['book-a', 'book-b'], due: { 'book-a': '2026-12-05', 'book-b': '2026-02-30', 'unknown': '2026-12-01' } }, titles);
  assert.deepEqual(r.due, { 'book-a': '2026-12-05' });
  // Not sending due dates keeps them; removing the book drops its date.
  assert.deepEqual((await setClassBooks(teacher, c.id, { books: ['book-a', 'book-b'] }, titles)).due, { 'book-a': '2026-12-05' });
  assert.deepEqual((await setClassBooks(teacher, c.id, { books: ['book-b'] }, titles)).due, {});
  assert.equal(dueDate('2026-11-31'), null);
  assert.equal(dueDate('2027-01-15'), '2027-01-15');
});

test('class quizzes: the teacher sets one, members answer once without seeing the answers first', async () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const c = await createClass(teacher, { name: 'Quiz class', kind: 'class' });
  await joinClass(pupil, { code: c.inviteCode }, titles);
  await setClassBooks(teacher, c.id, { books: ['book-a'] }, titles);
  const questions = [
    { question: 'Who?', options: ['Ama', 'Kofi'], answer: 1, explanation: 'Kofi did it.' },
    { question: 'Where?', options: ['Accra', 'Kumasi', 'Tamale'], answer: 0, explanation: '' },
    { question: 'Broken', options: ['only one'], answer: 0 },
  ];
  await assert.rejects(publishQuiz(pupil, c.id, { bookId: 'book-a', chapterIndex: 0, questions }), /Only the teacher/);
  await assert.rejects(publishQuiz(teacher, c.id, { bookId: 'book-b', chapterIndex: 0, questions }), /reading list first/);
  const { quiz } = await publishQuiz(teacher, c.id, { bookId: 'book-a', chapterIndex: 2, chapterTitle: 'The <i>river</i>', questions, due: '2026-12-01' });
  assert.equal(quiz.questions.length, 2);
  assert.equal(quiz.chapterTitle, 'The river');
  assert.equal(quiz.due, '2026-12-01');
  const before = await classDetail(pupil, c.id, titles, now);
  assert.equal('answer' in before.quizzes[0]!.questions[0]!, false, 'members do not see the answers before answering');
  const first = await answerQuiz(pupil, c.id, quiz.id, { answers: [1, 2] });
  assert.deepEqual([first.score.right, first.score.total, first.alreadyAnswered], [1, 2, false]);
  const again = await answerQuiz(pupil, c.id, quiz.id, { answers: [1, 0] });
  assert.deepEqual([again.score.right, again.alreadyAnswered], [1, true], 'only the first attempt counts');
  const after = await classDetail(pupil, c.id, titles, now);
  assert.equal((after.quizzes[0]!.questions[0] as { answer?: number }).answer, 1);
  const view = await classDetail(teacher, c.id, titles, now);
  assert.equal(view.rows[0]!.quizzes[quiz.id], 50);
  assert.equal(view.totals!.quizAverage, 50);
  // The teacher can try their own quiz without it counting.
  assert.equal((await answerQuiz(teacher, c.id, quiz.id, { answers: [1, 0] })).score.right, 2);
  assert.equal((await classDetail(teacher, c.id, titles, now)).rows.length, 1);
  await assert.rejects(removeQuiz(pupil, c.id, quiz.id), /Only the teacher/);
  assert.deepEqual(await removeQuiz(teacher, c.id, quiz.id), { ok: true });
  assert.equal((await classDetail(teacher, c.id, titles, now)).quizzes.length, 0);
});

test('class quizzes: routes are for signed-in readers', () => {
  const id = '0b3b7c1e-1d2a-4f5e-9a8b-123456789abc';
  assert.equal(accessFor('POST', `/api/reader/classes/${id}/quizzes`), 'reader');
  assert.equal(accessFor('DELETE', `/api/reader/classes/${id}/quizzes/${id}`), 'reader');
  assert.equal(accessFor('POST', `/api/reader/classes/${id}/quizzes/${id}/answers`), 'reader');
  assert.equal(accessFor('GET', `/api/reader/classes/${id}/quizzes`), 'admin');
});

test('teacher report: reading minutes per week for each member, teacher only', async () => {
  const now = new Date('2026-11-25T12:00:00Z'); // a Wednesday; this week starts Monday 23 Nov
  const c = await createClass(teacher, { name: 'Report class', kind: 'class' });
  await joinClass(other, { code: c.inviteCode }, titles);
  await setClassBooks(teacher, c.id, { books: ['book-a'] }, titles);
  readerMemory().sessions.push(
    { id: 'r1', user_id: 'user_other', book_id: 'book-a', started_at: '2026-11-24T08:00:00Z', seconds: 600, paragraphs: 1, words: 100, device: null },
    { id: 'r2', user_id: 'user_other', book_id: 'book-a', started_at: '2026-11-17T08:00:00Z', seconds: 1800, paragraphs: 1, words: 100, device: null },
    { id: 'r3', user_id: 'user_other', book_id: 'book-a', started_at: '2026-10-01T08:00:00Z', seconds: 900, paragraphs: 1, words: 100, device: null },
  );
  const r = await classReport(teacher, c.id, titles, '4', now);
  assert.deepEqual(r.weeks, ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']);
  const row = r.rows.find((x) => x.userId === 'user_other')!;
  assert.deepEqual(row.weekly, [0, 0, 30, 10]);
  assert.equal((await classReport(teacher, c.id, titles, '999', now)).weeks.length, 26);
  await assert.rejects(classReport(other, c.id, titles, 4, now), /Only the teacher/);
  assert.equal(accessFor('GET', `/api/reader/classes/${c.id}/report`), 'reader');
});

test('young readers in classes: stories on the list, finished when the questions are answered', async () => {
  const { recordYoungStory } = await import('./youngStories.js');
  const titled = async (id: string) => (id.startsWith('ya.') ? (await import('./youngStories.js')).youngTitle(id) : titles(id));
  const now = new Date('2026-11-25T12:00:00Z');
  const c = await createClass(teacher, { name: 'Year 1', kind: 'class' });
  const kid = { id: 'user_kid', email: 'k@example.test', name: 'Esi Owusu', role: 'reader' as const };
  await joinClass(kid, { code: c.inviteCode }, titled);
  const list = await setClassBooks(teacher, c.id, { books: ['ya.red-hat', 'ya.nope', 'book-a'] }, titled);
  assert.deepEqual(list.books, [{ id: 'ya.red-hat', title: 'Young readers · The Red Hat' }, { id: 'book-a', title: 'Book A' }]);
  await assert.rejects(recordYoungStory(kid.id, { storyId: 'nope', right: 1 }), /Unknown story/);
  await assert.rejects(recordYoungStory(kid.id, { storyId: 'red-hat', right: 9 }), /right answers/);
  await recordYoungStory(kid.id, { storyId: 'red-hat', right: 2 });
  await recordYoungStory(kid.id, { storyId: 'red-hat', right: 1 });
  const view = await classDetail(teacher, c.id, titled, now);
  const row = view.rows.find((r) => r.userId === kid.id)!;
  assert.equal(row.books['ya.red-hat'], 100);
  assert.deepEqual(row.stories['ya.red-hat'], { right: 2, total: 3 }, 'the best score is kept');
  assert.equal(accessFor('POST', '/api/reader/young/stories'), 'reader');
});
