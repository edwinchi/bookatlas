// Supabase security checks against the real project (owner request 2026-11-10).
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; with SUPABASE_ANON_KEY (the project's public
// key, which other apps on this shared project ship in browsers) it also proves that key reaches
// nothing of BookAtlas. Run: pnpm test:supabase (reads .env.local).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_ANON_KEY;
const configured = !!url && !!service;
const as = (key) => (key ? { apikey: key, Authorization: `Bearer ${key}` } : {});

const TABLES = ['books', 'categories', 'registered_users', 'subscribers', 'campaigns', 'publishing_jobs', 'publishing_messages',
  'publishing_test_books', 'ebook_submissions', 'prep_feedback', 'purchases'].map((t) => `bookatlas_${t}`);
const VIEWS = ['bookatlas_catalog_facets'];
const FUNCTIONS = ['bookatlas_catalog_facets', 'bookatlas_refresh_catalog_facets'];
const BUCKET = 'bookatlas-ebooks';

test('without a key the database and storage APIs refuse everything', { skip: !configured && 'SUPABASE_URL not set' }, async () => {
  for (const table of TABLES) {
    assert.equal((await fetch(`${url}/rest/v1/${table}?select=*&limit=1`)).status, 401, table);
  }
  const list = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"prefix":""}' });
  assert.ok(list.status >= 400, `storage list ${list.status}`);
});

test('the eBook bucket is private: no file is served through a public link', { skip: !configured && 'SUPABASE_URL not set' }, async () => {
  const bucket = await (await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: as(service) })).json();
  assert.equal(bucket.public, false, 'bucket is private');
  const sample = await (await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST', headers: { ...as(service), 'content-type': 'application/json' }, body: JSON.stringify({ prefix: 'books', limit: 5 }),
  })).json();
  for (const folder of sample.filter((o) => !o.id)) {
    const files = await (await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST', headers: { ...as(service), 'content-type': 'application/json' }, body: JSON.stringify({ prefix: `books/${folder.name}`, limit: 3 }),
    })).json();
    for (const file of files.filter((o) => o.id)) {
      const res = await fetch(`${url}/storage/v1/object/public/${BUCKET}/books/${folder.name}/${file.name}`);
      assert.notEqual(res.status, 200, `public link served books/${folder.name}/${file.name}`);
    }
  }
});

test('the public anon key reads, writes and runs nothing of BookAtlas', { skip: (!configured || !anon) && 'set SUPABASE_ANON_KEY in .env.local to run' }, async () => {
  const leaks = [];
  for (const object of [...TABLES, ...VIEWS]) {
    const res = await fetch(`${url}/rest/v1/${object}?select=*&limit=1`, { headers: as(anon) });
    const body = await res.json().catch(() => null);
    // A grant that RLS still blocks returns 200 with []; that is a warning, rows are a failure.
    if (res.ok && Array.isArray(body) && body.length) leaks.push(`${object}: rows readable`);
    else if (res.ok) leaks.push(`${object}: SELECT granted (RLS hides the rows; revoke the grant)`);
  }
  const insert = await fetch(`${url}/rest/v1/bookatlas_purchases`, {
    method: 'POST', headers: { ...as(anon), 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000000', user_id: 'x', book_id: 'x', checkout_session_id: 'x', amount_total: 0, currency: 'eur' }),
  });
  if (insert.ok) leaks.push('bookatlas_purchases: anon can insert a purchase');
  for (const fn of FUNCTIONS) {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { ...as(anon), 'content-type': 'application/json' }, body: '{}' });
    if (res.ok) leaks.push(`rpc ${fn}: callable with the anon key`);
  }
  const list = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST', headers: { ...as(anon), 'content-type': 'application/json' }, body: '{"prefix":"books","limit":5}',
  });
  const listed = await list.json().catch(() => null);
  if (list.ok && Array.isArray(listed) && listed.length) leaks.push(`storage ${BUCKET}: anon can list files`);
  assert.deepEqual(leaks, [], leaks.join('\n'));
});
