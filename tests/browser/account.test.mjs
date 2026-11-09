// Signed-in reader journey against a running stack with a Clerk development instance:
// sign up, bookshelf, data export, sign out, sign in, delete account. Run with `pnpm test:account`;
// BASE_URL overrides the default http://localhost:5173.
// Uses Clerk test mode: a "+clerk_test" email is never mailed and accepts the code 424242.
// The account is created fresh and erased through the app's own "Delete my account" control.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const email = `bookatlas-e2e-${Date.now()}+clerk_test@example.com`;
const password = `Atlas-${randomBytes(9).toString('base64url')}-9`;
const TEST_CODE = '424242';
let browser;
let page;
const cspViolations = [];
const pageErrors = [];

const status = () => page.getByRole('status').first();
const waitForStatus = (pattern) => page.waitForFunction(
  (source) => new RegExp(source).test(document.querySelector('[role="status"]')?.textContent ?? ''),
  pattern.source, { timeout: 20_000 },
);

// Each step depends on the one before it, so the journey stops at the first failure.
let broken = '';
function step(name, fn) {
  test(name, async (t) => {
    if (broken) return t.skip(`"${broken}" failed`);
    try { await fn(); } catch (err) { broken = name; throw err; }
  });
}

async function enterCodeIfAsked() {
  const code = page.locator('input[autocomplete="one-time-code"], input[name^="codeInput"]').first();
  if (await code.waitFor({ timeout: 5_000 }).then(() => true, () => false)) {
    await code.click();
    await page.keyboard.type(TEST_CODE);
  }
}

before(async () => {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  page = await context.newPage();
  page.on('console', (msg) => { if (/Content.Security.Policy/i.test(msg.text())) cspViolations.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(err.message));
});
after(async () => { await browser?.close(); });

step('sign-in is available (valid Clerk keys)', async () => {
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading your Bookatlas account'), null, { timeout: 10_000 });
  assert.doesNotMatch(await status().innerText(), /temporarily unavailable/, 'Clerk did not load: check CLERK_PUBLISHABLE_KEY');
});

step('a new reader can sign up after the age and privacy confirmation', async () => {
  await page.goto(base + '/sign-up', { waitUntil: 'networkidle' });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue to sign up' }).click();
  await page.locator('input[name="emailAddress"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const legal = page.locator('input[name="legalAccepted"]');
  if (await legal.count()) await legal.check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await enterCodeIfAsked();
  await waitForStatus(/Signed in as/);
  assert.match(await status().innerText(), new RegExp(`Signed in as ${email.replace(/[.+]/g, '\\$&')}`));
});

step('the bookshelf opens for the signed-in reader', async () => {
  await page.getByRole('link', { name: 'My Bookshelf' }).click();
  await page.waitForURL('**/user-portal');
  assert.match(await status().innerText(), /Signed in as/);
});

step('the reader can download their data', async () => {
  await page.getByRole('button', { name: /Privacy & data/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    page.getByRole('button', { name: 'Download my data' }).click(),
  ]);
  assert.equal(download.suggestedFilename(), 'bookatlas-account-export.json');
  const exported = await readFile(await download.path(), 'utf8');
  assert.ok(exported.includes(email), 'the export names the account email');
  await page.getByRole('button', { name: /Privacy & data/ }).click();
});

step('the reader can sign out and sign back in', async () => {
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await waitForStatus(/next chapter starts here/);
  await page.goto(base + '/sign-in', { waitUntil: 'networkidle' });
  await page.locator('input[name="identifier"]').fill(email);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  // Clerk may ask a new browser to confirm the sign-in by email code.
  await enterCodeIfAsked();
  await waitForStatus(/Signed in as/);
});

step('the reader can delete their account, and it no longer signs in', async () => {
  await page.getByRole('button', { name: /Privacy & data/ }).click();
  const remove = page.getByRole('button', { name: 'Delete my account' });
  assert.ok(await remove.isDisabled(), 'delete waits for the typed confirmation');
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await remove.click();
  await waitForStatus(/next chapter starts here/);
  await page.goto(base + '/sign-in', { waitUntil: 'networkidle' });
  await page.locator('input[name="identifier"]').fill(email);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText(/couldn.t find your account|not found|invalid/i).first().waitFor({ timeout: 10_000 });
});

test('no Content Security Policy violations or page errors occurred during the journey', () => {
  assert.deepEqual([...new Set(cspViolations)], []);
  assert.deepEqual(pageErrors, []);
});
