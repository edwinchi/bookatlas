import test from 'node:test';
import assert from 'node:assert/strict';
import { honestSample } from './ratings.js';
import type { Book } from '../types.js';

test('sample titles show no discount, bestseller label or award; books for sale keep theirs', () => {
  const base = { id: 'x', title: 'T', author: 'A', price: 9.99, originalPrice: 14.99, isDeal: true, isBestseller: true, awards: ['Nebula Award Finalist'] } as unknown as Book;
  const sample = honestSample({ ...base, isSample: true });
  assert.equal(sample.originalPrice, 9.99);
  assert.equal(sample.isDeal, false);
  assert.equal(sample.isBestseller, false);
  assert.deepEqual(sample.awards, []);
  const real = honestSample({ ...base, hasReaderContent: true });
  assert.deepEqual(real.awards, ['Nebula Award Finalist']);
  assert.equal(real.isDeal, true);
});
