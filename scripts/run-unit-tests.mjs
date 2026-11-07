import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('./package.json', import.meta.url));
function findFiles(dir, matcher) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, matcher));
    } else if (entry.isFile() && matcher(entry.name, fullPath)) {
      files.push(relative(root, fullPath).replaceAll('\\', '/'));
    }
  }
  return files;
}

const tests = [
  ...findFiles(join(root, 'scripts', 'src'), name => name.endsWith('.test.mjs') && name !== 'bookatlas-port.test.mjs'),
  ...findFiles(join(root, 'artifacts'), name => name.endsWith('.test.ts') && !name.endsWith('.d.ts')),
].sort();
// The port suite requires running services and a configured real auth browser.
const result = spawnSync(process.execPath, ['--import', pathToFileURL(require.resolve('tsx')).href, '--test', ...tests], { cwd: root, stdio: 'inherit' });
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
