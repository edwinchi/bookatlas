import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digestToken, getDigest, readDigestToken, runDigest, setDigest, unsubscribeDigest, weeklyEmail } from './digest.js';
import { readerMemory, saveSettingsKey } from './service.js';
import { accessFor } from '../../auth/policy.js';

const who = { id: 'user_digest', email: 'reader@example.test', name: 'Efua <b>Mensah</b>', role: 'reader' as const };
const session = (id: string, day: string, seconds: number) => ({ id, user_id: who.id, book_id: 'book-a', started_at: `${day}T09:00:00Z`, seconds, paragraphs: 1, words: 0, device: null });

test('reading e-mails: off by default, switched on with the sign-in address, stopped by the signed link', async () => {
  assert.deepEqual(await getDigest('nobody'), { weekly: false, streak: false, email: null });
  await assert.rejects(setDigest({ ...who, email: '' }, { weekly: true }), /no e-mail address/);
  assert.deepEqual(await setDigest(who, { weekly: true, email: 'someone-else@example.test' }), { weekly: true, streak: false, email: who.email });
  assert.deepEqual(await setDigest(who, { streak: true }), { weekly: true, streak: true, email: who.email });
  const token = digestToken(who.id);
  assert.equal(readDigestToken(token), who.id);
  assert.equal(readDigestToken(`${token.split('.')[0]}.forged`), null);
  assert.equal(await unsubscribeDigest('nope'), false);
  assert.equal(await unsubscribeDigest(token), true);
  assert.deepEqual(await getDigest(who.id), { weekly: false, streak: false, email: who.email });
});

test('reading e-mails: the daily run sends the streak reminder and, on Sunday, the weekly summary, once a day', async () => {
  await setDigest(who, { weekly: true, streak: true });
  await saveSettingsKey(who.id, 'dailyGoalMinutes', 15);
  await saveSettingsKey(who.id, 'family', { profiles: [{ id: 'kid-ama', name: 'Ama', kind: 'child', color: 'rose', level: 1, createdAt: '2026-11-01T00:00:00Z' }], challenge: { weeklyMinutes: 300 }, stats: {} });
  readerMemory().sessions.push(session('d1', '2026-11-27', 1200), session('d2', '2026-11-28', 600));
  const sent: { to: string[]; subject: string; html: string }[] = [];
  const send = async (e: typeof sent) => { sent.push(...e); return e.length; };
  // Sunday 29 Nov, not read yet today: a 2-day streak to keep, and the weekly summary.
  const sunday = new Date('2026-11-29T17:00:00Z');
  assert.deepEqual(await runDigest('https://booksatlas.app', send, sunday), { weekly: 1, streak: 1, sent: 2 });
  const weekly = sent.find((e) => e.subject.startsWith('Your reading week'))!;
  assert.equal(weekly.subject, 'Your reading week: 30 minutes, 2-day streak');
  assert.match(weekly.html, /on 2 days/);
  assert.match(weekly.html, /15 minutes a day: reached on 1 day/);
  assert.match(weekly.html, /Ama: 0 minutes/);
  assert.match(weekly.html, /Hi Efua,/);
  assert.match(weekly.html, /\/api\/reader\/digest\/unsubscribe\?token=/);
  assert.ok(sent.some((e) => e.subject === 'Keep your 2-day reading streak'));
  // The same day again: nothing more.
  assert.deepEqual(await runDigest('https://booksatlas.app', send, sunday), { weekly: 0, streak: 0, sent: 0 });
  // Monday after reading today: no reminder, and the summary only comes on Sunday.
  readerMemory().sessions.push(session('d3', '2026-11-30', 300));
  assert.deepEqual(await runDigest('https://booksatlas.app', send, new Date('2026-11-30T17:00:00Z')), { weekly: 0, streak: 0, sent: 0 });
});

test('reading e-mails: names in the e-mail are escaped; routes', () => {
  const e = weeklyEmail({ weekly: true, streak: false, email: 'a@b.co', name: '<i>x' }, { minutes: 0, daysRead: 0, goalMinutes: null, goalDays: 0, streak: 0, bestStreak: 0, booksFinished: 0, family: [{ name: '<script>', minutes: 1, streak: 0 }] }, 'https://booksatlas.app', 'https://booksatlas.app/u');
  assert.doesNotMatch(e.html, /<script>|<i>x/);
  assert.equal(e.subject, 'Your reading week on BooksAtlas');
  assert.equal(accessFor('GET', '/api/reader/digest'), 'reader');
  assert.equal(accessFor('PUT', '/api/reader/digest'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/digest/unsubscribe'), 'self-service');
  assert.equal(accessFor('GET', '/api/internal/reader/digest'), 'self-service');
  assert.equal(accessFor('POST', '/api/internal/reader/digest'), 'admin');
});
