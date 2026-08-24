import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server.js';

// Reused across warm invocations of this serverless function so in-memory
// state (catalog, subscribers, campaigns) survives while the instance is warm.
let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  app(req as any, res as any);
}
