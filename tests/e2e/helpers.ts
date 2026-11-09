import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';

// Initialize required signing secret in test process environment before any server import
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;

// Ensure hermetic offline execution: disable external LLM API keys during tests so the deterministic local synthesis fallbacks take over
delete process.env.OPENROUTER_API_KEY;
delete process.env.GEMINI_API_KEY;

const apiRequire = createRequire(new URL('../../artifacts/api-server/package.json', import.meta.url));
export const { PDFDocument } = apiRequire('pdf-lib');
// Express too: a clean pnpm install gives the workspace root no copy of its own.
const express = apiRequire('express');

export interface TestServerInstance {
  app: any;
  server: http.Server;
  baseUrl: string;
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
}

export async function createTestServer(): Promise<TestServerInstance> {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const { createApp } = await import('../../artifacts/api-server/src/bookatlas/server.ts');
  const innerApp = await createApp();
  const testApp = express();

  // Test authentication identity injector
  testApp.use((req: any, _res, next) => {
    const roleHeader = req.headers['x-test-role'];
    if (roleHeader === 'unauthenticated') {
      // Leave req.bookatlasIdentity undefined
    } else if (roleHeader === 'reader') {
      req.bookatlasIdentity = {
        id: 'test-reader-1',
        email: 'reader.amsterdam@bookatlas.nl',
        name: 'Sanne van Dijk',
        role: 'reader',
      };
    } else {
      req.bookatlasIdentity = {
        id: 'test-admin-1',
        email: 'eddyteddy78@gmail.com',
        name: 'Eddy (Platform Owner)',
        role: 'admin',
      };
    }
    next();
  });

  testApp.use(innerApp);

  const server = http.createServer(testApp);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const customFetch = (path: string, init?: RequestInit) => {
    const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    return fetch(url, init);
  };
  const close = () =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  return { app: testApp, server, baseUrl, fetch: customFetch, close };
}

let _sharedServer: TestServerInstance | null = null;
export async function getSharedTestServer(): Promise<TestServerInstance> {
  if (!_sharedServer) {
    _sharedServer = await createTestServer();
  }
  return _sharedServer;
}

export async function closeSharedTestServer(): Promise<void> {
  if (_sharedServer) {
    await _sharedServer.close();
    _sharedServer = null;
  }
}
