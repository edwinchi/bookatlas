import test from 'node:test';
import assert from 'node:assert/strict';
import { reloadForNewRelease } from './lazyPage.js';

test('a missing file of an old release reloads the page once, never in a loop', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  let reloads = 0;
  const reload = () => { reloads++; };
  assert.equal(reloadForNewRelease(1_000_000, storage, reload), true);
  assert.equal(reloadForNewRelease(1_010_000, storage, reload), false, 'not again within 30 s');
  assert.equal(reloadForNewRelease(1_040_000, storage, reload), true, 'a later release may reload again');
  assert.equal(reloads, 2);
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => {} };
  assert.equal(reloadForNewRelease(2_000_000, broken, reload), false, 'without storage it never reloads');
});
