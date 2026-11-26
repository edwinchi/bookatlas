import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICES, cycleSeconds, phaseAt, practiceById, scaleFor, totalSeconds } from './breathing';

test('breathing: many practices for adults and children, each well formed', () => {
  assert.ok(PRACTICES.filter((p) => !p.forKids).length >= 8);
  assert.ok(PRACTICES.filter((p) => p.forKids).length >= 7);
  assert.equal(new Set(PRACTICES.map((p) => p.id)).size, PRACTICES.length);
  for (const p of PRACTICES) {
    assert.ok(p.phases.some((x) => x.kind === 'out' || x.kind === 'hum'), `${p.id} breathes out`);
    assert.ok(totalSeconds(p) >= 30 && totalSeconds(p) <= 180, `${p.id}: half a minute to three minutes`);
    assert.ok(p.when.length && p.intro && p.phases.every((x) => x.seconds > 0 && x.cue), p.id);
    // Calming: the breath out is never shorter than the breath in.
    const inS = p.phases.filter((x) => x.kind === 'in' || x.kind === 'sniff').reduce((n, x) => n + x.seconds, 0);
    const outS = p.phases.filter((x) => x.kind === 'out' || x.kind === 'hum').reduce((n, x) => n + x.seconds, 0);
    assert.ok(outS >= inS, `${p.id}: out at least as long as in`);
  }
});

test('breathing: the guide knows the round, the phase and the seconds left', () => {
  const box = practiceById('box')!;
  assert.equal(cycleSeconds(box), 16);
  assert.deepEqual(phaseAt(box, 0)?.phase.kind, 'in');
  assert.deepEqual([phaseAt(box, 5)?.phase.kind, phaseAt(box, 5)?.left], ['hold', 3]);
  assert.equal(phaseAt(box, 17)?.round, 2);
  assert.equal(phaseAt(box, totalSeconds(box)), null, 'finished');
  const bunny = practiceById('bunny')!;
  assert.ok(scaleFor(bunny, 2) > scaleFor(bunny, 0), 'sniffs fill up step by step');
  assert.equal(scaleFor(bunny, 3), 0.55, 'then a long breath out');
  assert.equal(scaleFor(box, 1), 1, 'holding after in stays full');
});
