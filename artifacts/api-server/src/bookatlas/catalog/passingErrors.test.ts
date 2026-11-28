import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPassingDbError } from './store';

test('catalogue: only database errors that pass by themselves are tried again', () => {
  assert.equal(isPassingDbError({ code: 'PGRST303', message: 'JWT issued at future' }), true);
  assert.equal(isPassingDbError({ message: 'TypeError: fetch failed' }), true);
  assert.equal(isPassingDbError({ code: '42P01', message: 'relation does not exist' }), false);
  assert.equal(isPassingDbError({}), false);
});
