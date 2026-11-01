import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, NODE_ENV: 'development', BOOKATLAS_LOCAL_DEV: 'true', SESSION_SECRET: process.env.SESSION_SECRET || randomBytes(32).toString('hex'), BASE_PATH: '/', VITE_CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '' };
if (!env.CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY) {
  console.error('Set matching Clerk development CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env.local. See README.md.');
  process.exit(1);
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
const apiDir = path.join(root, 'artifacts/api-server');
const webDir = path.join(root, 'artifacts/bookatlas');
const apiRequire = createRequire(path.join(apiDir, 'package.json'));
const webRequire = createRequire(path.join(webDir, 'package.json'));
for (const [name, port, cwd, args] of [
  ['API', process.env.API_PORT || '3001', apiDir, ['--watch', '--import', pathToFileURL(apiRequire.resolve('tsx')).href, 'src/index.ts']],
  ['web', process.env.WEB_PORT || '5173', webDir, [path.join(path.dirname(webRequire.resolve('vite/package.json')), 'bin/vite.js'), '--host', '127.0.0.1']],
]) {
  const child = spawn(process.execPath, args, { cwd, env: { ...env, PORT: port }, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => { console.error(name, error); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 1); });
}
console.log(`BookAtlas: http://localhost:${process.env.WEB_PORT || '5173'} (Ctrl+C to stop both services)`);
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
