import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { minimumPrintPrice, podPackageId, printOrderSplit, printPriceCents, shippingAddressFrom } from './pricing.js';
import { statusFrom } from './orders.js';
import { validLuluSignature } from './lulu.js';

test('Lulu product codes: 27 characters, from trim, paper and binding', () => {
  assert.equal(podPackageId({ trimSize: '6x9', paper: 'white', binding: 'paperback' }), '0600X0900BWSTDPB060UW444MXX');
  assert.equal(podPackageId({ trimSize: '5.5x8.5', paper: 'cream', binding: 'paperback' }), '0550X0850BWSTDPB060UC444MXX');
  assert.equal(podPackageId({ trimSize: '8.5x11', paper: 'color', binding: 'hardcover' }), '0850X1100FCPRECW080CW444MXX');
  for (const trimSize of ['5x8', '5.5x8.5', '6x9', '7x10', '8.5x11'] as const) {
    assert.equal(podPackageId({ trimSize, paper: 'cream', binding: 'hardcover' }).length, 27);
  }
});

test('an order: the reader pays the price and delivery with VAT; the author keeps 81% after printing', () => {
  // Two copies at €14.99 to the Netherlands; Lulu: €4.20 a copy, €1.50 fulfilment, €4.50 delivery (excluding tax).
  const s = printOrderSplit(1499, 2, 'NL', { printExcl: 840, fulfilmentExcl: 150, shippingExcl: 450 }, '2026-11-24T10:00:00Z');
  assert.equal(s.rateBp, 900);
  assert.equal(s.bookGross, 2998);
  assert.equal(s.bookNet, 2750, '2998 / 1.09');
  assert.equal(s.shippingGross, 491, '450 × 1.09, delivery passed on at cost');
  assert.equal(s.totalGross, 3489);
  assert.equal(s.productionExcl, 990);
  assert.equal(s.authorShare, 1426, '81% of (2750 − 990)');
  assert.equal(s.commission, 334);
  // Outside the EU no Dutch VAT is charged.
  const us = printOrderSplit(1499, 1, 'US', { printExcl: 420, fulfilmentExcl: 150, shippingExcl: 900 });
  assert.equal(us.rateBp, 0);
  assert.equal(us.shippingGross, 900);
  assert.equal(us.authorShare, Math.round((1499 - 570) * 0.81));
});

test('the author is never paid below zero, and the minimum price leaves at least €0.50 a copy', () => {
  assert.equal(printOrderSplit(500, 1, 'NL', { printExcl: 600, fulfilmentExcl: 150, shippingExcl: 0 }).authorShare, 0);
  const min = minimumPrintPrice(570);
  assert.equal(min, 679, '(570 + 50) × 1.09 = 675.8, rounded up to a price ending in 9');
  assert.ok(printOrderSplit(min, 1, 'NL', { printExcl: 420, fulfilmentExcl: 150, shippingExcl: 0 }).marginExcl >= 50);
});

test('print prices: €3 to €250, in cents', () => {
  assert.equal(printPriceCents(14.99), 1499);
  assert.equal(printPriceCents('9.5'), 950);
  for (const bad of [2.99, 250.01, 'abc', '', null, -5]) assert.throws(() => printPriceCents(bad), RangeError, String(bad));
});

test('delivery address: complete, trimmed, with a state where the printer needs one', () => {
  const ok = shippingAddressFrom({ name: ' Ada  ', street1: 'Damrak 1', city: 'Amsterdam', postcode: '1012 LG', countryCode: 'nl', phone: '+31 6 1234 5678' }, 'ada@example.com');
  assert.equal(ok.name, 'Ada');
  assert.equal(ok.countryCode, 'NL');
  assert.equal(ok.email, 'ada@example.com', 'the account e-mail is used when none is given');
  assert.throws(() => shippingAddressFrom({ name: 'Ada', street1: 'x', city: 'y', postcode: 'z', countryCode: 'NL' }, 'a@b.co'), /phone number/);
  assert.throws(() => shippingAddressFrom({ name: 'Ada', street1: 'x', city: 'Austin', postcode: '78701', countryCode: 'US', phone: '+1 512 555 0100' }, 'a@b.co'), /state/);
});

test('Lulu statuses as readers see them; Lulu webhooks must be signed with the API secret', () => {
  assert.equal(statusFrom('PRODUCTION_READY'), 'submitted');
  assert.equal(statusFrom('IN_PRODUCTION'), 'in_production');
  assert.equal(statusFrom('SHIPPED'), 'shipped');
  assert.equal(statusFrom('UNPAID'), 'needs_attention', 'Lulu could not charge BooksAtlas: the owner must act');
  const before = process.env.LULU_CLIENT_SECRET;
  process.env.LULU_CLIENT_SECRET = 'synthetic-lulu-secret';
  const body = Buffer.from('{"topic":"PRINT_JOB_STATUS_CHANGED","data":{"id":1}}');
  assert.ok(validLuluSignature(body, createHmac('sha256', 'synthetic-lulu-secret').update(body).digest('hex')));
  assert.ok(!validLuluSignature(body, createHmac('sha256', 'wrong').update(body).digest('hex')));
  assert.ok(!validLuluSignature(body, undefined));
  if (before === undefined) delete process.env.LULU_CLIENT_SECRET; else process.env.LULU_CLIENT_SECRET = before;
});
