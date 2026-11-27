// Runs after `vite build`: one copy of the built index.html per public page, each with its own head (see pageHeads.mjs).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAGES, pageHtml } from './pageHeads.mjs';

const out = fileURLToPath(new URL('../dist/public/', import.meta.url));
const shell = readFileSync(out + 'index.html', 'utf8');
mkdirSync(out + 'pages', { recursive: true });
for (const page of PAGES) writeFileSync(`${out}pages/${page.file}.html`, pageHtml(shell, page));
console.log(`page heads: ${PAGES.length} pages written to dist/public/pages`);
