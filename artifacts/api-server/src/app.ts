import express, { type Express } from "express";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { bookatlasAccess } from "./auth/access";
import { rateLimit } from "./middlewares/rateLimit";
import { securityHeaders } from "./middlewares/securityHeaders";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createApp } from "./bookatlas/server";

const app: Express = express();
app.disable("x-powered-by");
// Exactly one proxy hop (nginx locally, Vercel's edge in production) supplies the client IP.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(
  rateLimit([
    { prefix: "/api/users/register", limit: 20 },
    { prefix: "/api/auth/me", limit: 60 },
    { prefix: "/api/account", limit: 30 },
    { prefix: "/api/account/export", limit: 5 },
    { prefix: "/api/ai", limit: 30 },
    { prefix: "/api/gemini", limit: 30 },
    { prefix: "/api/ebook-submissions", limit: 240 },
    { prefix: "/api/internal/ebook-checks", limit: 120 },
    { prefix: "/api/checkout", limit: 30 },
    { prefix: "/api/stripe/webhook", limit: 600 },
    { prefix: "/api/crypto/orders", limit: 60 },
    { prefix: "/api/crypto/callback", limit: 600 },
    { prefix: "/api/reader/ai", limit: 30 },
    { prefix: "/api/reader/groups", limit: 60 },
    { prefix: "/api/reader/reports", limit: 20 },
    { prefix: "/api/internal/narration/cron", limit: 5 },
    { prefix: "/api/internal/narration/local", limit: 240 },
    { prefix: "/api/audio-samples", limit: 60 },
    { prefix: "/api/book-enquiries", limit: 5 },
  ]),
);
// Without a secret key Clerk throws on every request, taking the public catalog down with it.
// Skip it instead: public routes keep working and account routes fail closed with 503.
if (process.env.CLERK_SECRET_KEY?.trim()) {
  // Only the API reads the session. On book and author pages (shared links, search results) Clerk would
  // otherwise redirect a first-time visitor through its handshake before the page loads (found 2026-11-20).
  const clerk = clerkMiddleware((req) => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  }));
  // Mounted at the root (Clerk sees the full path) but skipped for pages.
  app.use((req, res, next) => (req.path === "/api" || req.path.startsWith("/api/") ? clerk(req, res, next) : next()));
} else {
  logger.error({ event: "auth.provider_unconfigured" }, "CLERK_SECRET_KEY is not set: sign-in and account routes are unavailable");
}
app.use("/api", bookatlasAccess);
app.use("/api", router);
app.use(await createApp());

export default app;
