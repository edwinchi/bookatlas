// EPUBCheck worker (TASK-0003). Claims prepared eBooks from the BookAtlas API, runs the official
// W3C EPUBCheck on each, and posts the messages back. The API decides whether to fix and re-check.
//   API_URL             e.g. https://booksatlas.app or http://api:3001
//   EBOOK_WORKER_TOKEN  same value as the API's, 32+ characters
//   EPUBCHECK_JAR       default /opt/epubcheck/epubcheck.jar
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const api = (process.env.API_URL ?? '').replace(/\/+$/, '');
const token = process.env.EBOOK_WORKER_TOKEN?.trim() ?? '';
const jar = process.env.EPUBCHECK_JAR ?? '/opt/epubcheck/epubcheck.jar';
const idleMs = Number(process.env.POLL_SECONDS ?? 15) * 1000;
const once = process.argv.includes('--once');

if (!api || token.length < 32) {
  console.error('Set API_URL and EBOOK_WORKER_TOKEN (32+ characters).');
  process.exit(2);
}

const headers = { authorization: `Bearer ${token}` };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message, extra = {}) => console.log(JSON.stringify({ time: new Date().toISOString(), message, ...extra }));

function epubcheck(file, report) {
  return new Promise((resolve, reject) => {
    const child = spawn('java', ['-jar', jar, file, '--json', report], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    // EPUBCheck exits 1 when it finds errors; a missing report is the real failure.
    child.on('close', (code) => (code === 0 || code === 1 ? resolve() : reject(new Error(`epubcheck exited ${code}: ${stderr.slice(0, 500)}`))));
  });
}

async function checkOne() {
  const claim = await fetch(`${api}/api/internal/ebook-checks/claim`, { method: 'POST', headers });
  if (claim.status === 204) return false;
  if (!claim.ok) throw new Error(`claim failed: ${claim.status}`);
  const job = await claim.json();
  const parts = [];
  for (let part = 0; part < job.parts; part += 1) {
    const res = await fetch(`${api}/api/internal/ebook-checks/${job.id}/parts/${part}`, { headers });
    if (!res.ok) throw new Error(`part ${part} failed: ${res.status}`);
    parts.push(Buffer.from(await res.arrayBuffer()));
  }
  const bytes = Buffer.concat(parts);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== job.sha256 || bytes.length !== job.size) throw new Error('downloaded file does not match the claim');

  const dir = await mkdtemp(join(tmpdir(), 'epubcheck-'));
  try {
    const file = join(dir, 'book.epub');
    const report = join(dir, 'report.json');
    await writeFile(file, bytes);
    await epubcheck(file, report);
    const parsed = JSON.parse(await readFile(report, 'utf8'));
    const messages = (parsed.messages ?? []).map((m) => ({
      severity: m.severity, code: m.ID, message: m.message,
      location: m.locations?.[0] ? `${m.locations[0].path}:${m.locations[0].line}` : undefined,
    }));
    const res = await fetch(`${api}/api/internal/ebook-checks/${job.id}/result`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ sha256, messages }),
    });
    if (!res.ok) throw new Error(`result failed: ${res.status}`);
    log('checked', { id: job.id, messages: messages.length, status: (await res.json()).status });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  return true;
}

for (;;) {
  try {
    const worked = await checkOne();
    if (once) process.exit(0);
    if (!worked) await sleep(idleMs);
  } catch (error) {
    log('check failed', { error: String(error?.message ?? error) });
    if (once) process.exit(1);
    await sleep(idleMs);
  }
}
