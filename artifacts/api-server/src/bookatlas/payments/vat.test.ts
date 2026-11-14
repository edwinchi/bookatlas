import test from 'node:test';
import assert from 'node:assert/strict';
import { crossBorderStatus, vatFor, vatForLines } from './vat.js';

test('Dutch 9% e-book VAT is taken out of the VAT-inclusive price for every EU buyer below the threshold', () => {
  assert.deepEqual(vatFor(936, 'NL'), { country: 'NL', scheme: 'nl-domestic', rateBp: 900, gross: 936, net: 859, vat: 77 });
  assert.deepEqual(vatFor(936, 'de'), { country: 'DE', scheme: 'nl-eu-threshold', rateBp: 900, gross: 936, net: 859, vat: 77 });
  assert.equal(vatFor(499, 'FR').vat, 41);
});

test('buyers outside the EU pay no Dutch VAT; an unknown country is treated as Dutch', () => {
  assert.deepEqual(vatFor(936, 'US'), { country: 'US', scheme: 'outside-eu', rateBp: 0, gross: 936, net: 936, vat: 0 });
  assert.equal(vatFor(936, 'GB').vat, 0);
  assert.deepEqual(vatFor(936, null), { country: null, scheme: 'unknown-country-nl', rateBp: 900, gross: 936, net: 859, vat: 77 });
  assert.equal(vatFor(936, 'not a country').scheme, 'unknown-country-nl');
});

test('order totals are the sum of the per-line VAT, so invoice lines always add up', () => {
  const order = vatForLines([936, 499, 1], 'BE');
  assert.equal(order.gross, 1436);
  assert.equal(order.vat, order.lines.reduce((s, l) => s + l.vat, 0));
  assert.equal(order.net + order.vat, order.gross);
});

test('the €10,000 cross-border threshold warns at 80% and flags when passed, this year or last', () => {
  assert.equal(crossBorderStatus(0, 0).state, 'ok');
  assert.equal(crossBorderStatus(799_999, 0).state, 'ok');
  assert.equal(crossBorderStatus(800_000, 0).state, 'warning');
  assert.equal(crossBorderStatus(0, 1_000_001).state, 'over', 'passing it last year means per-country VAT all of this year');
});
