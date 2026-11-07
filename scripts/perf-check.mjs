// Latency check against a running stack: `pnpm test:perf` (BASE_URL defaults to http://localhost:5173).
// Open-loop load: requests start on a fixed schedule (PERF_RPS per second) whether or not earlier ones have
// finished, which matches real arrivals and the TASK-0001 budget (p95 under 300 ms at 50 requests/second).
// Uses public endpoints because account routes are rate limited per client.
const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const rps = Number(process.env.PERF_RPS || 50);
const seconds = Number(process.env.PERF_SECONDS || 10);
const budgetMs = Number(process.env.PERF_P95_MS || 300);

async function measure(path) {
  const latencies = [];
  let failures = 0;
  const pending = [];
  const started = performance.now();
  for (let i = 0; i < rps * seconds; i += 1) {
    const due = started + (i * 1000) / rps;
    const wait = due - performance.now();
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    const sent = performance.now();
    pending.push(fetch(base + path).then(async res => {
      if (!res.ok) failures += 1;
      await res.arrayBuffer();
    }).catch(() => { failures += 1; }).finally(() => latencies.push(performance.now() - sent)));
  }
  await Promise.all(pending);
  latencies.sort((a, b) => a - b);
  const pct = p => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))].toFixed(1);
  return { path, requests: latencies.length, failures, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99) };
}

const results = [];
for (const path of ['/api/healthz', '/api/books', '/api/categories', '/']) results.push(await measure(path));
console.table(results);
const over = results.filter(r => Number(r.p95) > budgetMs || r.failures > 0);
if (over.length) {
  console.error(`p95 budget ${budgetMs} ms exceeded or requests failed:`, over.map(r => r.path).join(', '));
  process.exit(1);
}
console.log(`All endpoints within p95 budget of ${budgetMs} ms at ${rps} requests/second.`);
