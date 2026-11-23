import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_KEY_SECONDS, audioKey, validAudioKey } from './audioKey.js';
import { byteRange } from '../../lib/sendAudio.js';
import { derivedKey } from '../../lib/serverSecret.js';

test('a listening key plays its own book until it expires, and no other book', () => {
  const now = Date.UTC(2026, 10, 23, 12);
  const key = audioKey('atlas-ebook-4049bf92', now);
  assert.ok(validAudioKey('atlas-ebook-4049bf92', key, now));
  assert.ok(validAudioKey('atlas-ebook-4049bf92', key, now + (AUDIO_KEY_SECONDS - 5) * 1000));
  assert.equal(validAudioKey('atlas-ebook-4049bf92', key, now + (AUDIO_KEY_SECONDS + 1) * 1000), false, 'expired');
  assert.equal(validAudioKey('atlas-ebook-00000000', key, now), false, 'another book');
});

test('a forged, altered or stretched listening key is refused', () => {
  const now = Date.UTC(2026, 10, 23, 12);
  const key = audioKey('atlas-ebook-4049bf92', now);
  const [exp, sig] = key.split('.');
  assert.equal(validAudioKey('atlas-ebook-4049bf92', `${Number(exp) + 3600}.${sig}`, now), false, 'later expiry, same signature');
  assert.equal(validAudioKey('atlas-ebook-4049bf92', `${exp}.${sig!.slice(0, -1)}A`, now), false);
  const farFuture = Math.floor(now / 1000) + 10 * 365 * 86400;
  assert.equal(validAudioKey('atlas-ebook-4049bf92', `${farFuture}.${sig}`, now), false, 'expiry beyond what the server issues');
  for (const bad of [undefined, '', 'x', ['a'], `${exp}.${sig}.x`, `${exp}.${sig}`.repeat(3)]) assert.equal(validAudioKey('atlas-ebook-4049bf92', bad, now), false);
});

test('signing keys never fall back to a public phrase in production', () => {
  const saved = { s: process.env.SESSION_SECRET, u: process.env.UNSUBSCRIBE_TOKEN_SECRET, v: process.env.VERCEL };
  try {
    delete process.env.SESSION_SECRET; delete process.env.UNSUBSCRIBE_TOKEN_SECRET; process.env.VERCEL = '1';
    assert.throws(() => derivedKey('x'), /not configured/);
    process.env.UNSUBSCRIBE_TOKEN_SECRET = 'a-real-random-secret';
    assert.notDeepEqual(derivedKey('one'), derivedKey('two'), 'each purpose has its own key');
  } finally {
    for (const [k, v] of [['SESSION_SECRET', saved.s], ['UNSUBSCRIBE_TOKEN_SECRET', saved.u], ['VERCEL', saved.v]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test('byte ranges, as Safari asks for audio', () => {
  assert.equal(byteRange(undefined, 100), null);
  assert.deepEqual(byteRange('bytes=0-1', 100), { start: 0, end: 1 });
  assert.deepEqual(byteRange('bytes=50-', 100), { start: 50, end: 99 });
  assert.deepEqual(byteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange('bytes=90-500', 100), { start: 90, end: 99 }, 'clamped to the end');
  assert.equal(byteRange('bytes=100-', 100), 'invalid');
  assert.equal(byteRange('bytes=5-2', 100), 'invalid');
  assert.equal(byteRange('bytes=0-1,5-6', 100), null, 'several ranges: whole file');
  assert.equal(byteRange('items=0-1', 100), null);
});
