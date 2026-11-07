import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { rateLimit, ruleFor } from './rateLimit';

const rules = [{ prefix: '/api/account', limit: 3 }, { prefix: '/api/account/export', limit: 1 }];

function call(limiter: ReturnType<typeof rateLimit>, url: string, ip = '203.0.113.7') {
  const headers: Record<string, string> = {};
  let status = 200;
  let passed = false;
  const res = {
    setHeader: (name: string, value: string) => { headers[name] = value; },
    status(code: number) { status = code; return this; },
    json() { return this; },
  } as unknown as Response;
  limiter({ originalUrl: url, ip } as Request, res, () => { passed = true; });
  return { status: passed ? 200 : status, headers };
}

test('the most specific rate-limit rule applies and unrelated routes are untouched', () => {
  assert.equal(ruleFor('/api/account/export', rules)?.limit, 1);
  assert.equal(ruleFor('/api/account', rules)?.limit, 3);
  assert.equal(ruleFor('/api/accounts', rules), undefined);
  assert.equal(ruleFor('/api/books', rules), undefined);
});

test('a client over the limit gets 429 with Retry-After until the window resets', () => {
  let clock = 1_000_000;
  const limiter = rateLimit(rules, 60_000, () => clock);
  for (let i = 0; i < 3; i += 1) assert.equal(call(limiter, '/api/account').status, 200);
  const blocked = call(limiter, '/api/account?x=1');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers['Retry-After'], '60');
  assert.equal(call(limiter, '/api/account', '198.51.100.1').status, 200, 'other clients keep their own budget');
  assert.equal(call(limiter, '/api/books').status, 200);
  clock += 60_000;
  assert.equal(call(limiter, '/api/account').status, 200, 'window resets');
});
