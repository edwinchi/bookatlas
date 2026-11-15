import test from 'node:test';
import assert from 'node:assert/strict';
import { launchScore, smartPrice } from './launch.js';

const base = {
  title: 'Scroll of Sovereignty', subtitle: 'How to Reclaim Your Mind, Your Field, and Your Power', author: 'Apehgong Edwin Chi', language: 'English',
  description: 'Reclaim your mind in forty days.\n\n' + 'This guide shows you how attention, feeling and belief shape your days, with practices you can use every morning. '.repeat(6),
  categories: ['Mind Mastery & Quantum Awakening', 'Consciousness & Ancient Wisdom', 'Self-Improvement & Psychology'],
  keywords: ['sovereign consciousness', 'quantum field', 'subconscious reprogramming', 'I AM presence', 'hermetic principles', 'forty day protocol'],
  copyrightHolder: 'Apehgong Edwin Chi', copyrightYear: 2026, price: 9.99, rightsConfirmed: true, aiContent: 'none' as const, wantsPrint: false,
  authorBio: 'Apehgong Edwin Chi writes from Zwolle about consciousness and sovereignty, drawing on science and African and indigenous cosmology for readers who want practical change.',
};

test('a complete, well-written listing is ready to launch', () => {
  const r = launchScore({ intake: base, words: 55_752, cover: { width: 1707, height: 2560 }, findings: { errors: 0, warnings: 0 } });
  assert.ok(r.score >= 90, `${r.score}`);
  assert.equal(r.grade, 'Ready to launch');
  assert.deepEqual(r.improvements, []);
});

test('weak spots are named with what to do, the biggest gain first', () => {
  const r = launchScore({ intake: { ...base, title: 'SCROLL OF SOVEREIGNTY', description: 'A book. '.repeat(25), categories: ['Mind Mastery & Quantum Awakening'], keywords: ['scroll'], authorBio: '', price: 0 },
    words: 55_752, cover: { width: 1024, height: 1536 }, findings: { errors: 0, warnings: 1 } });
  assert.ok(r.score < 65, `${r.score}`);
  assert.equal(r.grade, 'Needs work');
  const ids = r.improvements.map((i) => i.id);
  for (const id of ['cover', 'title', 'description', 'categories', 'keywords', 'bio', 'price', 'quality']) assert.ok(ids.includes(id), id);
  assert.match(r.improvements.find((i) => i.id === 'title')!.tip, /"Scroll of Sovereignty"/);
  assert.ok(r.improvements[0]!.gain >= r.improvements.at(-1)!.gain, 'sorted by gain');
  assert.equal(launchScore({ intake: base, cover: null }).checks.find((c) => c.id === 'cover')!.points, 0);
});

test('smart pricing follows length and category; earnings use the 67% share excluding 9% VAT', () => {
  const nonfiction = smartPrice(55_752, ['Self-Improvement & Psychology']);
  assert.deepEqual([nonfiction.low, nonfiction.recommended, nonfiction.high], [5.99, 8.99, 11.99]);
  const fiction = smartPrice(55_752, ['Thriller & Crime']);
  assert.deepEqual([fiction.low, fiction.recommended, fiction.high], [4.99, 7.99, 9.99]);
  assert.equal(smartPrice(10_000, []).recommended, 2.99);
  assert.equal(nonfiction.earningsPerSale, 5.53, '€8.99 / 1.09 × 67%');
  assert.equal(nonfiction.copiesFor100, 19);
});
