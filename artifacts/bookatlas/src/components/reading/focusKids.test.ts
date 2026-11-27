import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICES } from './breathing';
import { GYM_TEXT, localPractice, spokenCue } from './focusKids';

test('children’s focus gym: every language has every game and every children’s practice, cue by cue', () => {
  const kids = PRACTICES.filter((p) => p.forKids);
  for (const [lang, t] of Object.entries(GYM_TEXT)) {
    for (const g of ['breath', 'numbers', 'stars', 'words'] as const) assert.ok(t.games[g].name && t.games[g].what && t.games[g].trains, `${lang}: ${g}`);
    if (lang === 'en') continue;
    for (const p of kids) {
      const tr = t.practices[p.id];
      assert.ok(tr, `${lang}: ${p.id}`);
      assert.equal(tr.cues.length, p.phases.length, `${lang}: ${p.id} has one cue per phase`);
      const local = localPractice(p, t);
      assert.equal(local.phases.reduce((n, x) => n + x.seconds, 0), p.phases.reduce((n, x) => n + x.seconds, 0), 'same timing');
    }
    const all = JSON.stringify(t.practices) + Object.values(t.games).map((g) => g.name + g.what).join('');
    assert.ok(!/'/.test(all), `${lang}: typographic apostrophes`);
    assert.match(t.numbersNote(16, 12.5, 2, 20), /16.*12\.5.*2.*20/);
  }
});

test('children’s focus gym: repeated cues are said once', () => {
  const bunny = PRACTICES.find((p) => p.id === 'bunny')!;
  assert.deepEqual(bunny.phases.map((_, i) => spokenCue(bunny, i)), ['Sniff', null, null, 'A long breath out']);
  const fr = localPractice(bunny, GYM_TEXT.fr);
  assert.equal(spokenCue(fr, 0), 'Renifle');
  assert.equal(spokenCue(fr, 3), 'Une longue expiration');
});
