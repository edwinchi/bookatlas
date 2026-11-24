import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audiobookPlan, ebookComparison, narrationPriceCents, printEarnings } from './pricing';
import { narrationPrice } from '../../../../api-server/src/bookatlas/narration/plan';

test('the calculator charges for narration exactly what the server charges', () => {
  for (const words of [0, 10_000, 60_000, 60_001, 70_000, 80_000, 155_000, 280_000]) assert.equal(narrationPriceCents(words), narrationPrice(words), `${words} words`);
});

test('an €8.99 eBook: BooksAtlas pays 81% of the price excluding VAT, more than every listed platform but Pro', () => {
  const rows = ebookComparison(8.99, 9, 2);
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by.booksatlas!.perSale, 6.68, '8.99 / 1.09 × 81%');
  assert.equal(by['booksatlas-pro']!.perSale, 7.51);
  assert.equal(by.kdp!.rate, '70%');
  assert.equal(by.kdp!.perSale, 5.61, '70% × (8.2477 − 2 MB × €0.12)');
  assert.equal(by.kobo!.perSale, 5.77);
  assert.equal(rows[0]!.id, 'booksatlas-pro', 'sorted by earnings');
  assert.ok(rows.filter((r) => !r.ours).every((r) => r.perSale < by.booksatlas!.perSale || r.id === 'lulu'), 'only Lulu’s 90% headline beats Standard');
});

test('price thresholds: KDP drops to 35% above €9.99 and below €2.69; Kobo and Smashwords drop below 2.99', () => {
  const at = (price: number, id: string) => ebookComparison(price, 9).find((r) => r.id === id)!;
  assert.equal(at(14.99, 'kdp').rate, '35%');
  assert.equal(at(1.99, 'kdp').rate, '35%');
  assert.equal(at(1.99, 'kobo').rate, '45%');
  assert.equal(at(1.99, 'smashwords').rate, '40%');
  assert.equal(at(0, 'booksatlas').perSale, 0);
});

test('audiobook: narration price, earnings per sale and the copies that pay it back', () => {
  const plan = audiobookPlan(80_000, 9.99, 9);
  assert.equal(plan.narration, 32.97, '€24.99 + 2 × €3.99');
  assert.equal(plan.perSale, 7.42, '9.99 / 1.09 × 81%');
  assert.equal(plan.paysBackAfter, 5);
  assert.equal(audiobookPlan(50_000, 0, 9).paysBackAfter, null);
});

test('print: BooksAtlas pays 81% after printing; KDP 60% of the price excluding VAT less printing; Lulu 80% of what remains', () => {
  const p = printEarnings(14.99, 9, 4.35);
  assert.equal(p.booksatlas, 7.62, '(13.7523 − 4.35) × 0.81');
  assert.equal(p.kdp, 3.9, '0.6 × 13.75 − 4.35');
  assert.equal(p.lulu, 7.52, '(13.75 − 4.35) × 0.8');
  assert.equal(p.kdpMinimumPrice, 7.9, 'below this KDP pays nothing');
  assert.equal(printEarnings(5, 9, 10).kdp, 0, 'never negative');
});
