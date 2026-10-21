import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readerReturnUrl, safeReaderReturnPath } from './navigation';

const origin = 'https://books.example.test';

test('accepts the bookstore and explicit reader destinations inside its base path', () => {
  assert.equal(safeReaderReturnPath('/bookatlas/', origin, '/bookatlas'), '/');
  assert.equal(safeReaderReturnPath('/user-portal?view=wishlist', origin, '/bookatlas'), '/user-portal?view=wishlist');
  assert.equal(safeReaderReturnPath('/bookatlas/user-portal?resume=checkout', origin, '/bookatlas'), '/user-portal?resume=checkout');
  assert.equal(safeReaderReturnPath('/bookatlas/user-portal?view=wishlist', origin, '/bookatlas'), '/user-portal?view=wishlist');
  assert.equal(safeReaderReturnPath('/bookatlas/checkout', origin, '/bookatlas'), '/checkout');
});

test('retains only the requested whitelisted AI service', () => {
  assert.equal(
    safeReaderReturnPath('/bookatlas/user-portal?view=ai&service=chat&secret=ignore', origin, '/bookatlas'),
    '/user-portal?view=ai&service=chat',
  );
  assert.equal(
    safeReaderReturnPath('/user-portal?view=ai&service=unknown', origin),
    '/user-portal?view=ai',
  );
});

test('rejects external, protocol-relative, and unrecognized destinations', () => {
  for (const candidate of [
    'https://attacker.example/steal',
    '//attacker.example/steal',
    '/bookatlas/internal',
    '/wrong-prefix/user-portal',
    '/\\attacker.example',
  ]) {
    assert.equal(safeReaderReturnPath(candidate, origin, '/bookatlas'), '/', candidate);
  }
});

test('never replays an unsupported destination or admin action', () => {
  assert.equal(safeReaderReturnPath('/user-portal?view=admin&role=admin', origin), '/user-portal');
  assert.equal(safeReaderReturnPath('/admin?token=not-kept', origin), '/admin');
  assert.equal(readerReturnUrl('/user-portal?resume=checkout', origin, '/bookatlas'), `${origin}/bookatlas/user-portal?resume=checkout`);
});
