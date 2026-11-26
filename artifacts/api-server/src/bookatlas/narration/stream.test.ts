import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streamPlan } from './service.js';
import { accessFor } from '../../auth/policy.js';

const parts = [{ n: 3, bytes: 100 }, { n: 4, bytes: 50 }, { n: 5, bytes: 200 }];

test('narration stream: byte ranges map onto the joined parts', () => {
  assert.deepEqual(streamPlan(parts, 0, 1000), { total: 350, end: 349, slices: [{ n: 3, from: 0, to: 99 }, { n: 4, from: 0, to: 49 }, { n: 5, from: 0, to: 199 }] });
  assert.deepEqual(streamPlan(parts, 90, 30), { total: 350, end: 119, slices: [{ n: 3, from: 90, to: 99 }, { n: 4, from: 0, to: 19 }] }, 'across a part boundary');
  assert.deepEqual(streamPlan(parts, 150, 10).slices, [{ n: 5, from: 0, to: 9 }], 'starts exactly at a part');
  assert.deepEqual(streamPlan(parts, 340, 100), { total: 350, end: 349, slices: [{ n: 5, from: 190, to: 199 }] }, 'the end of the book');
  assert.deepEqual(streamPlan(parts, 350, 10).slices, [], 'past the end');
  const sizes = streamPlan(parts, 0, 120).slices.map((s) => s.to - s.from + 1);
  assert.equal(sizes.reduce((a, b) => a + b, 0), 120, 'never more than the chunk');
});

test('narration stream: the address is open to readers (the key or the purchase is checked in the route)', () => {
  assert.equal(accessFor('GET', '/api/reader/catalog/atlas-ebook-1234abcd/narration/stream/0'), 'self-service');
  assert.equal(accessFor('GET', '/api/reader/catalog/atlas-ebook-1234abcd/narration/stream/x'), 'admin');
});
