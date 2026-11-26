import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_WORDS, PICTURE_BOOKS } from './firstWords';
import { RHYMES, STAGES, activityLink, emptyLittle, lastWeek, monthsOld, readLittle, stageFor, toggleDone } from './littleOnes';

test('little ones: six stages cover 0 months to 3 years without gaps', () => {
  assert.equal(STAGES.length, 6);
  assert.equal(STAGES[0]!.from, 0);
  for (let i = 1; i < STAGES.length; i += 1) assert.equal(STAGES[i]!.from, STAGES[i - 1]!.to, `${STAGES[i]!.id} starts where the stage before ends`);
  for (let m = 0; m <= 36; m += 1) assert.ok(stageFor(m), `${m} months has a stage`);
  assert.equal(stageFor(0)!.id, 'newborn');
  assert.equal(stageFor(5)!.id, 'reaching');
  assert.equal(stageFor(12)!.id, 'first-words');
  assert.equal(stageFor(36)!.id, 'storyteller');
  assert.equal(stageFor(37), null, 'past three: Young readers');
});

test('little ones: every activity points at something that exists', () => {
  const ids = new Set<string>();
  for (const s of STAGES) {
    assert.ok(s.activities.length >= 4 && s.tips.length >= 3 && s.notice.length >= 3, s.id);
    for (const a of s.activities) {
      assert.ok(!ids.has(a.id), `unique id ${a.id}`); ids.add(a.id);
      if (a.kind === 'rhyme') assert.ok(RHYMES.some((r) => r.id === a.rhyme), `${a.id}: rhyme ${a.rhyme}`);
      if (a.kind === 'words') assert.ok(FIRST_WORDS.some((g) => g.id === a.group), `${a.id}: group ${a.group}`);
      if (a.kind === 'book') assert.ok(PICTURE_BOOKS.some((b) => b.id === a.book), `${a.id}: book ${a.book}`);
      assert.ok(a.minutes >= 1 && a.minutes <= 5, `${a.id}: short`);
    }
    // The youngest get the least screen: most of a newborn's plan is the grown-up's voice.
    if (s.id === 'newborn') assert.ok(!s.activities.some((a) => ['words', 'find', 'stories', 'sounds'].includes(a.kind)));
  }
  assert.equal(activityLink({ id: 'x', kind: 'words', title: '', how: '', minutes: 1, group: 'animals' }), 'reading-intelligence/young-readers?tab=first&first=words&group=animals');
  assert.equal(activityLink({ id: 'x', kind: 'talk', title: '', how: '', minutes: 1 }), null);
  for (const r of RHYMES) assert.ok(r.lines.length >= 4 && r.lines.every((l) => l.text && !/'/.test(l.text)), r.id);
});

test('little ones: age from a birth month, and progress kept safely', () => {
  const now = new Date(2026, 10, 26);
  assert.equal(monthsOld('2026-11', now), 0);
  assert.equal(monthsOld('2025-11', now), 12);
  assert.equal(monthsOld('2024-05', now), 30);
  assert.equal(monthsOld('2027-01', now), null, 'not born yet');
  assert.equal(monthsOld('2026-13', now), null);
  assert.equal(monthsOld(null, now), null);
  let p = emptyLittle();
  p = toggleDone(p, 'nb-talk', now);
  p = toggleDone(p, 'nb-contrast', now);
  assert.deepEqual(p.done['2026-11-26'], ['nb-talk', 'nb-contrast']);
  p = toggleDone(p, 'nb-talk', now);
  assert.deepEqual(p.done['2026-11-26'], ['nb-contrast']);
  const week = lastWeek(p, now);
  assert.equal(week.length, 7);
  assert.equal(week.at(-1)!.done, true);
  assert.equal(week[0]!.done, false);
  const clean = readLittle({ birth: '2026-02', stage: 'babbling', done: { '2026-11-25': ['nb-talk', 'nope', 3], bad: ['nb-talk'] } });
  assert.deepEqual(clean.done, { '2026-11-25': ['nb-talk'] });
  assert.equal(clean.stage, 'babbling');
  assert.deepEqual(readLittle('rubbish'), emptyLittle());
});

test('little ones in French, Spanish, Portuguese and Dutch: every stage, activity, rhyme and page word', async () => {
  const { LITTLE_UI, loadLittle, fill } = await import('./littleOnes');
  for (const lang of ['fr', 'es', 'pt', 'nl']) {
    const c = await loadLittle(lang);
    for (const [k, v] of Object.entries(LITTLE_UI)) {
      const t = c.ui[k as keyof typeof LITTLE_UI];
      assert.ok(t && t.trim(), `${lang}: ui.${k}`);
      for (const ph of v.match(/\{\w+\}/g) ?? []) assert.ok(t.includes(ph), `${lang}: ui.${k} keeps ${ph}`);
    }
    assert.notEqual(c.ui.intro, LITTLE_UI.intro, `${lang}: translated`);
    for (const [i, s] of c.stages.entries()) {
      const en = STAGES[i]!;
      assert.equal(s.id, en.id);
      assert.notEqual(s.name, en.name, `${lang}: ${s.id} name`);
      assert.ok(s.tips.length >= 3 && s.notice.length >= 3, `${lang}: ${s.id} tips and notice`);
      for (const [j, a] of s.activities.entries()) {
        assert.equal(a.id, en.activities[j]!.id);
        assert.notEqual(a.how, en.activities[j]!.how, `${lang}: ${a.id} translated`);
      }
    }
    for (const [i, r] of c.rhymes.entries()) {
      assert.equal(r.id, RHYMES[i]!.id);
      assert.notEqual(r.title, RHYMES[i]!.title, `${lang}: ${r.id} title`);
      assert.ok(r.lines.length >= 4 && r.lines.every((l) => l.text.trim() && !/'/.test(l.text)), `${lang}: ${r.id} lines`);
    }
  }
  assert.equal(fill('{n} of {total}', { n: 2, total: 12 }), '2 of 12');
  assert.equal((await loadLittle('de')).ui.intro, LITTLE_UI.intro, 'no translation: English');
});
