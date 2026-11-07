// Vercel serverless entry: the bundled Express API (built by `pnpm --filter @workspace/api-server run build`).
// In-memory state lives per warm instance; durable data requires the Supabase settings.
export { default } from '../artifacts/api-server/dist/app.mjs';
