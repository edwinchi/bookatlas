import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTHOR_SHARE, SHARE_CHANGED_AT, authorShareOf, shareRate } from './authorSales.js';

test('authors keep 81% from 23 November 2026; earlier sales keep the 67% they were made under', () => {
  assert.equal(AUTHOR_SHARE, 0.81);
  assert.equal(SHARE_CHANGED_AT, '2026-11-23T00:00:00.000Z');
  assert.equal(shareRate('2026-11-22T23:59:59.999Z'), 0.67);
  assert.equal(shareRate('2026-11-23T00:00:00.000Z'), 0.81);
  assert.equal(authorShareOf(458, '2026-12-01T10:00:00.000Z'), 371, '€4.58 excluding VAT → €3.71');
  assert.equal(authorShareOf(458, '2026-11-20T10:00:00.000Z'), 307, 'an older sale still earns €3.07');
});
