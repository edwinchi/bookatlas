import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeSignOut } from '../../artifacts/bookatlas/src/auth/session.ts';
test('sign-out retains account until Clerk confirms session termination', async () => {
  let finish;
  let cleared = false;
  const pending = completeSignOut(() => new Promise(resolve => { finish = resolve; }), () => { cleared = true; }, () => assert.fail('unexpected error'));
  assert.equal(cleared, false);
  finish();
  await pending;
  assert.equal(cleared, true);
});
test('sign-out failure preserves account and reports an actionable error without rejecting', async () => {
  let notice = false;
  await completeSignOut(async () => { throw new Error('offline'); }, () => assert.fail('account must stay visible'), () => { notice = true; });
  assert.equal(notice, true);
});
