import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('./package.json', import.meta.url));
const tests = readdirSync(new URL('./src/', import.meta.url))
  .filter(name => name.endsWith('.test.mjs') && name !== 'bookatlas-port.test.mjs')
  .sort().map(name => `scripts/src/${name}`);
// The port suite requires running services and a configured real auth browser.
const result = spawnSync(process.execPath, ['--import', require.resolve('tsx'), '--test', ...tests], { cwd: root, stdio: 'inherit' });
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
