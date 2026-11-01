import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clerkRouterPath, readerReturnUrl, safeReaderReturnPath } from '../../artifacts/bookatlas/src/auth/navigation.ts';
test('Clerk navigation handles absolute and relative auth callback URLs under a base path', () => {
  assert.equal(clerkRouterPath('https://books.example/app/sign-in/factor-one?x=1#step', 'https://books.example', '/app'), '/sign-in/factor-one?x=1#step');
  assert.equal(clerkRouterPath('/app/sign-up', 'https://books.example', '/app'), '/sign-up');
  assert.equal(clerkRouterPath('/application', 'https://books.example', '/app'), '/application');
  assert.throws(() => clerkRouterPath('https://evil.example/', 'https://books.example', '/app'));
});
test('login return destinations reject external URLs and preserve checkout intent', () => {
  assert.equal(safeReaderReturnPath('//evil.example'), '/');
  assert.equal(readerReturnUrl('/user-portal?resume=checkout', 'https://books.example', '/app'), 'https://books.example/app/user-portal?resume=checkout');
});
