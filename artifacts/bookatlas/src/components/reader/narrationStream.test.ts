import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bytesPerSecond, canStream, partAt, streamLayout, timeOfPart } from './narrationStream';

test('narration stream: parts are found from the playing time', () => {
  const sizes = [80_000, 40_000, 160_000]; // 10 s, 5 s and 20 s at 64 kbps
  const { starts, total } = streamLayout(sizes.map((bytes) => ({ bytes })));
  assert.deepEqual(starts, [0, 80_000, 120_000]);
  assert.equal(total, 280_000);
  const bps = bytesPerSecond(total, NaN);
  assert.equal(bps, 8000, 'before the length is known: 64 kbps');
  assert.equal(bytesPerSecond(total, 35), 8000);
  assert.deepEqual(partAt(starts, sizes, 0, bps), { index: 0, local: 0, length: 10 });
  assert.deepEqual(partAt(starts, sizes, 12, bps), { index: 1, local: 2, length: 5 });
  assert.deepEqual(partAt(starts, sizes, 15, bps), { index: 2, local: 0, length: 20 }, 'exactly at the start of a part');
  assert.equal(partAt(starts, sizes, 99, bps).index, 2, 'past the end stays on the last part');
  assert.equal(timeOfPart(starts, 2, bps), 15);
  assert.equal(timeOfPart(starts, 9, bps), 15);
});

test('narration stream: only when every part has a size', () => {
  assert.equal(canStream([{ bytes: 10 }, { bytes: 20 }]), true);
  assert.equal(canStream([{ bytes: 10 }, { bytes: 0 }]), false, 'an older narration plays part by part');
  assert.equal(canStream([{}]), false);
  assert.equal(canStream([]), false);
});
