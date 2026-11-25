import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ME, MAX_PROFILES, addActivity, emptyFamily, familyView, readFamily, streakOf, summarize, weekStart, withProfiles } from './family.js';
import { accessFor } from '../../auth/policy.js';

const now = new Date('2026-11-25T15:00:00Z'); // a Wednesday
const kid = { id: 'kid-amara', name: '  Amara <b> ', kind: 'child', color: 'rose', level: 2 };

test('family profiles: cleaned, at most six, never "me", and removed reading goes with a removed profile', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ id: `kid-${i}xx`, name: `Kid ${i}`, kind: 'teen' }));
  let f = withProfiles(emptyFamily(), { profiles: [kid, { id: 'me', name: 'Me' }, { id: 'bad id!', name: 'X' }, ...many], challenge: { weeklyMinutes: 400 } }, now);
  assert.equal(f.profiles.length, MAX_PROFILES);
  assert.deepEqual(f.profiles[0], { id: 'kid-amara', name: 'Amara b', kind: 'child', color: 'rose', level: 2, createdAt: now.toISOString() });
  assert.equal(f.challenge.weeklyMinutes, 400);
  f = addActivity(f, { profileId: 'kid-amara', minutes: 20, words: 1500, bookId: 'atlas-afr-002' }, now);
  f = withProfiles(f, { profiles: [] }, now);
  assert.deepEqual(Object.keys(f.stats), []);
  assert.equal(f.challenge.weeklyMinutes, 400, 'the challenge stays when it is not sent');
});

test('family activity: minutes, books, quizzes and stars per profile, with limits', () => {
  let f = withProfiles(emptyFamily(), { profiles: [kid] }, now);
  f = addActivity(f, { profileId: 'kid-amara', minutes: 20, words: 1500, bookId: 'atlas-afr-002' }, now);
  f = addActivity(f, { profileId: 'kid-amara', minutes: 9999, quiz: { score: 4, total: 5 }, stars: 3 }, now); // minutes over the cap are ignored
  f = addActivity(f, { profileId: ME, quiz: { score: 6, total: 5 }, stars: 500 }, now); // impossible quiz and too many stars
  assert.throws(() => addActivity(f, { profileId: 'someone-else' }, now), /Unknown reader profile/);
  const s = f.stats['kid-amara']!;
  assert.deepEqual(s.days['2026-11-25'], { m: 20, w: 1500 });
  assert.deepEqual(s.books, ['atlas-afr-002']);
  assert.equal(s.quizzes.length, 1);
  assert.equal(s.stars, 3);
  assert.deepEqual(f.stats[ME], { days: {}, books: [], quizzes: [], stars: 0 });
  // Round trip through storage keeps it.
  assert.deepEqual(readFamily(JSON.parse(JSON.stringify(f))), f);
  assert.deepEqual(readFamily('garbage'), emptyFamily());
});

test('family dashboard: week, streak, quiz average and the weekly challenge', () => {
  assert.equal(weekStart(now), '2026-11-23');
  const days = { '2026-11-23': { m: 10, w: 0 }, '2026-11-24': { m: 15, w: 0 }, '2026-11-22': { m: 30, w: 0 } };
  assert.equal(streakOf(days, now), 3, 'no reading today yet keeps yesterday’s streak');
  const sum = summarize({ days, books: ['a', 'b'], quizzes: [{ at: now.toISOString(), score: 3, total: 4 }, { at: now.toISOString(), score: 5, total: 5 }], stars: 7 }, now);
  assert.equal(sum.weekMinutes, 25);
  assert.equal(sum.totalMinutes, 55);
  assert.equal(sum.quizAverage, 88);
  assert.equal(sum.last14.length, 14);
  let f = withProfiles(emptyFamily(), { profiles: [kid], challenge: { weeklyMinutes: 60 } }, now);
  f = addActivity(f, { profileId: 'kid-amara', minutes: 25 }, now);
  const view = familyView(f, 40, now);
  assert.deepEqual(view.challenge, { weeklyMinutes: 60, weekMinutes: 65, weekStart: '2026-11-23', met: true });
  assert.deepEqual(view.summaries.map((s) => s.id), [ME, 'kid-amara']);
});

test('family routes are for signed-in readers only', () => {
  assert.equal(accessFor('GET', '/api/reader/family'), 'reader');
  assert.equal(accessFor('PUT', '/api/reader/family'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/family/activity'), 'reader');
  assert.equal(accessFor('DELETE', '/api/reader/family'), 'admin');
});
