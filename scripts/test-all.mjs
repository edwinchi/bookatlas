// Runs every check in order and prints a summary: offline suites first, then the suites against a
// running stack (BASE_URL, default http://localhost:5173). The Docker test container runs this:
//   docker compose --env-file .env.local --profile test run --rm tests
// TEST_STAGES=unit,browser runs a subset.
import { spawnSync } from 'node:child_process';

const stages = [
  ['typecheck', 'offline'],
  ['test:unit', 'offline'],
  ['test:e2e', 'offline'],
  ['test:catalog', 'offline'],
  ['test:security', 'stack'],
  ['test:browser', 'stack'],
  ['test:sweep', 'stack'],
  ['test:account', 'stack'],
  ['test:perf', 'stack'],
];
const only = process.env.TEST_STAGES?.split(',').map((s) => s.trim()).filter(Boolean);
const selected = only?.length ? stages.filter(([name]) => only.some((o) => name === o || name === `test:${o}`)) : stages;

const results = [];
for (const [name, kind] of selected) {
  console.log(`\n=== ${name} (${kind}) ===`);
  const started = Date.now();
  const run = spawnSync('pnpm', ['run', name], { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ stage: name, kind, result: run.status === 0 ? 'pass' : 'FAIL', seconds: Math.round((Date.now() - started) / 1000) });
}
console.log();
console.table(results);
const failed = results.filter((r) => r.result !== 'pass');
console.log(failed.length ? `${failed.length} stage(s) failed: ${failed.map((r) => r.stage).join(', ')}` : 'All stages passed.');
process.exit(failed.length ? 1 : 0);
