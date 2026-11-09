// Click-through sweep against a running stack: every header menu item, the utility row, the mobile menu and
// the landing controls. Run with `pnpm test:sweep`; BASE_URL overrides the default http://localhost:5173.
// Exits non-zero on any failed check or uncaught page error.
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const browser = await chromium.launch();
const results = [];
const errors = [];
const ok = (name, pass, detail = '') => results.push({ name, pass, detail });

async function fresh(viewport = { width: 1366, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#landing-title', { timeout: 15000 });
  return page;
}

const inView = (page, id) => page.waitForFunction((id) => {
  const el = document.getElementById(id);
  if (!el) return false;
  const top = el.getBoundingClientRect().top;
  return top >= 0 && top < 260;
}, id, { timeout: 5000 }).then(() => true, () => false);

const dialogOpen = (page) => page.waitForFunction(() =>
  [...document.querySelectorAll('[role="dialog"], [aria-modal="true"], div.fixed.inset-0')].some((el) => el.getBoundingClientRect().height > 100),
  null, { timeout: 4000 }).then(() => true, () => false);

const site = (page) => page.getByRole('navigation', { name: 'Site' });

async function openMenu(page, label) {
  await site(page).getByRole('button', { name: label, exact: true }).click();
  return site(page).getByRole('button', { name: label, exact: true });
}

// 1. Menu mechanics: click opens, Escape closes and returns focus, outside click closes, arrow keys move.
{
  const page = await fresh();
  const btn = await openMenu(page, 'Store');
  ok('Store menu opens on click', (await btn.getAttribute('aria-expanded')) === 'true');
  await page.keyboard.press('Escape');
  ok('Escape closes menu', (await btn.getAttribute('aria-expanded')) === 'false');
  ok('Escape returns focus to button', await btn.evaluate((el) => el === document.activeElement));
  await btn.focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  const first = await page.evaluate(() => document.activeElement?.textContent ?? '');
  ok('ArrowDown opens and focuses first item', /All eBooks/.test(first), first.slice(0, 40));
  await page.keyboard.press('ArrowDown');
  const second = await page.evaluate(() => document.activeElement?.textContent ?? '');
  ok('ArrowDown moves to next item', /Audiobooks/.test(second), second.slice(0, 40));
  await page.locator('#landing-title').click();
  ok('Outside click closes menu', (await btn.getAttribute('aria-expanded')) === 'false');
  await site(page).getByRole('button', { name: 'Publish', exact: true }).hover();
  await page.waitForTimeout(100);
  ok('Hover opens menu', (await site(page).getByRole('button', { name: 'Publish', exact: true }).getAttribute('aria-expanded')) === 'true');
  await page.close();
}

// 2. Every menu item.
const sectionItems = [
  ['Store', 'All eBooks', 'bookstore'],
  ['Publish', 'Create and self-publish', 'how-it-works'],
  ['Publish', 'eBook publishing', 'pricing'],
  ['Publish', 'Print-ready files', 'pricing'],
  ['Publish', 'Pricing and royalties', 'earnings'],
  ['Resources', 'Publishing guide', 'how-it-works'],
  ['Resources', 'Who it is for', 'solutions'],
  ['Resources', 'Book pages', 'book-pages'],
  ['About', 'About BookAtlas', 'about'],
  ['About', 'Our promise', 'promise'],
];
{
  const page = await fresh();
  for (const [menu, item, id] of sectionItems) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await openMenu(page, menu);
    await site(page).getByRole('button', { name: new RegExp(`^${item}`) }).click();
    ok(`${menu} › ${item} scrolls to #${id}`, await inView(page, id));
  }
  // From another view: search hides the landing, then a menu link brings it back.
  await page.getByLabel('Search the book catalog').first().fill('griot');
  await page.waitForTimeout(300);
  ok('Search hides the landing', (await page.locator('#landing-title').count()) === 0);
  await openMenu(page, 'Publish');
  await site(page).getByRole('button', { name: /^Pricing and royalties/ }).click();
  ok('Menu link from search results restores landing and scrolls', await inView(page, 'earnings'));
  ok('Search was cleared', (await page.getByLabel('Search the book catalog').first().inputValue()) === '');
  await page.close();
}
for (const [menu, item, check] of [
  ['Store', 'Audiobooks', 'tab'], ['Store', 'Deals under €4.99', 'tab'], ['Store', 'Bookatlas Plus', 'tab'],
  ['Store', 'AI Book Matchmaker', 'signin'], ['Store', 'AI Studio', 'signin'], ['Store', 'Live Voice companion', 'signin'],
  ['Resources', 'EPUB and technical specs', 'dialog'],
]) {
  const page = await fresh();
  await openMenu(page, menu);
  await site(page).getByRole('button', { name: new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click();
  if (check === 'signin') {
    const went = await page.waitForURL(/sign-in/, { timeout: 5000 }).then(() => true, () => false);
    ok(`${menu} › ${item} asks guests to sign in`, went, page.url().replace(base, ''));
  } else if (check === 'dialog') ok(`${menu} › ${item} opens a dialog`, await dialogOpen(page));
  else {
    await page.waitForTimeout(300);
    const landingGone = (await page.locator('#landing-title').count()) === 0;
    const heading = await page.locator('main h1').first().innerText().catch(() => '');
    ok(`${menu} › ${item} switches view`, landingGone, heading.slice(0, 50));
  }
  await page.close();
}
{
  const page = await fresh();
  const hrefs = {};
  for (const [menu, item] of [['Publish', 'Start a book'], ['Author hub', 'Join early access'], ['Resources', 'Help'], ['About', 'Contact us'], ['About', 'Privacy notice'], ['About', 'Legal notice']]) {
    await openMenu(page, menu);
    hrefs[item] = await site(page).getByRole('link', { name: new RegExp(`^${item}`) }).getAttribute('href');
    await page.keyboard.press('Escape');
  }
  for (const [item, href] of Object.entries(hrefs)) {
    const good = /Privacy|Legal/.test(item) ? /^\/(privacy|legal)$/.test(href) : href.startsWith('mailto:getintouch@apps-pilot.nl?subject=');
    ok(`${item} link target`, good, href);
  }
  await openMenu(page, 'Author hub');
  const soon = await site(page).getByText('Soon', { exact: true }).count();
  ok('Author hub and Publish list 6 planned features as Soon', soon === 6, `${soon} badges`);
  ok('Soon entries are not focusable', (await site(page).locator('li:has-text("Soon") >> [data-nav-item]').count()) === 0);
  await page.keyboard.press('Escape');
  for (const path of ['/privacy', '/legal']) {
    const r = await page.request.get(base + path);
    ok(`${path} serves`, r.ok(), String(r.status()));
  }
  const startBook = await page.getByRole('link', { name: 'Start a book', exact: true }).first().getAttribute('href');
  ok('Start a book pill is a mailto', startBook?.startsWith('mailto:'), startBook);
  // Language and currency.
  await page.getByLabel('Currency').first().selectOption('USD');
  await page.waitForTimeout(200);
  ok('Currency switch updates prices', /\$\d/.test(await page.locator('main').innerText()));
  await page.getByLabel('Language').first().selectOption('nl');
  await page.waitForTimeout(200);
  const prefs = await page.evaluate(() => Object.entries(localStorage).find(([k]) => /prefer/i.test(k))?.[1] ?? '');
  ok('Language and currency persist', /"nl"/.test(prefs) && /USD/.test(prefs), prefs);
  // Utility row.
  const status = await page.getByRole('status').first().innerText().catch(() => '');
  ok('Utility row shows sign-in status', /Sign-in is temporarily unavailable|next chapter|Signed in/.test(status), status.slice(0, 60));
  // Landing controls.
  await page.getByRole('button', { name: 'Pause covers' }).click();
  ok('Cover shelf pauses', (await page.getByRole('button', { name: 'Play covers' }).getAttribute('aria-pressed')) === 'true');
  await page.locator('ul.animate-marquee > li:not([aria-hidden]) button').nth(3).click({ timeout: 8000 });
  ok('Clicking a cover opens the book', await dialogOpen(page));
  await page.keyboard.press('Escape');
  await page.close();
}

// 3. Mobile menu.
{
  const page = await fresh({ width: 390, height: 844 });
  ok('Site menu row hidden on mobile', !(await site(page).isVisible()));
  for (const [label, id] of [['Services and pricing', 'pricing'], ['How it works', 'how-it-works'], ['Earnings calculator', 'earnings'], ['Bookstore', 'bookstore']]) {
    await page.getByRole('button', { name: 'Open bookstore menu' }).click();
    await page.locator('#bookstore-mobile-menu').getByRole('button', { name: label, exact: true }).click();
    ok(`Mobile › ${label} scrolls to #${id}`, await inView(page, id));
  }
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed; page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
process.exit(failed.length || errors.length ? 1 : 0);
