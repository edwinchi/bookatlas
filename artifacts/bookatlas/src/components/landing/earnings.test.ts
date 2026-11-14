import { test } from 'node:test';
import assert from 'node:assert/strict';
import { betterPlan, monthlyEarnings, proPaysMoreFrom } from './earnings';

test('standard keeps 67% of eBook sales with no monthly fee', () => {
  assert.deepEqual(monthlyEarnings(9.99, 10, 'standard'), { sales: 99.9, commission: 32.97, fee: 0, net: 66.93 });
});

test('Author Pro keeps 77% of sales less the €9.99 monthly fee', () => {
  assert.deepEqual(monthlyEarnings(9.99, 10, 'pro'), { sales: 99.9, commission: 22.98, fee: 9.99, net: 66.93 });
});

test('Pro pays more once the 10-point saving exceeds the fee', () => {
  assert.equal(proPaysMoreFrom(9.99), 11);
  assert.equal(proPaysMoreFrom(4.99), 21);
  assert.equal(proPaysMoreFrom(0), null);
  for (const price of [0.99, 2.99, 4.99, 7.99, 9.99, 14.99, 24.99]) {
    const from = proPaysMoreFrom(price)!;
    assert.equal(betterPlan(price, from), 'pro', `pro at ${from} copies of ${price}`);
    assert.equal(betterPlan(price, from - 1), 'standard', `standard at ${from - 1} copies of ${price}`);
  }
});

test('recommends Pro only when it pays strictly more', () => {
  assert.equal(betterPlan(9.99, 10), 'standard');
  assert.equal(betterPlan(9.99, 11), 'pro');
  assert.equal(betterPlan(4.99, 3), 'standard');
});

test('ignores negative and fractional input', () => {
  assert.equal(monthlyEarnings(-5, 3, 'standard').sales, 0);
  assert.equal(monthlyEarnings(5, 2.7, 'standard').sales, 10);
});
