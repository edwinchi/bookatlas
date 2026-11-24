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
    // Hardening (2026-11-23): the public routes that read the database or stream books and audio, and a
    // ceiling for everything else. A reader turning pages or listening stays far below these.
    { prefix: "/api/catalog", limit: 240 },
    { prefix: "/api/reader/catalog", limit: 600 },
    { prefix: "/api/reviews", limit: 60 },
    { prefix: "/api/follows", limit: 60 },
    { prefix: "/api/narration", limit: 60 },
    { prefix: "/api/invoices", limit: 30 },
    { prefix: "/api/author", limit: 60 },
    { prefix: "/api/subscribers", limit: 20 },
    { prefix: "/api/reader-unsubscribe", limit: 20 },
    { prefix: "/api/csp-report", limit: 30 },
    { prefix: "/api/client-error", limit: 20 },
    { prefix: "/api", limit: 1200 },
  ]),
);
// Pages report what the Content Security Policy blocked (middlewares/pageCsp.ts), so a legitimate resource the
// policy misses shows up in the logs instead of silently breaking a page. Only the directive and the blocked
// host are kept: no query strings, no personal data.
app.post(
  "/api/csp-report",
  express.json({ type: ["application/csp-report", "application/reports+json", "application/json"], limit: "8kb" }),
  (req, res) => {
    const body = req.body as { "csp-report"?: Record<string, unknown> } | Array<{ body?: Record<string, unknown> }> | undefined;
    const reports = Array.isArray(body) ? body.map((r) => r.body ?? {}) : [body?.["csp-report"] ?? {}];
    const host = (u: unknown) => { try { return typeof u === "string" ? (/^[a-z]+$/.test(u) ? u : new URL(u).origin) : undefined; } catch { return String(u).slice(0, 40); } };
    const path = (u: unknown) => { try { return typeof u === "string" ? new URL(u).pathname.slice(0, 120) : undefined; } catch { return undefined; } };
    for (const r of reports.slice(0, 5)) {
      req.log?.warn({
        event: "csp.violation",
        directive: String(r["violated-directive"] ?? r["effectiveDirective"] ?? r["effective-directive"] ?? "").slice(0, 60),
        blocked: host(r["blocked-uri"] ?? r["blockedURL"]),
        page: path(r["document-uri"] ?? r["documentURL"]),
      }, "Content Security Policy blocked a resource");
    }
    res.status(204).end();
  },
);
// A page that crashed in a reader's browser reports it (owner report 2026-11-25: a blank page on a phone that could
// not be reproduced elsewhere). Kept: the message, the script file and line, the page path, the browser family.
// Not kept: query strings, account details, the full user agent.
app.post("/api/client-error", express.json({ type: ["application/json", "text/plain"], limit: "4kb" }), (req, res) => {
  const b = (typeof req.body === "object" && req.body ? req.body : {}) as Record<string, unknown>;
  const text = (v: unknown, n: number) => (typeof v === "string" ? v.split(/[?#]/)[0].slice(0, n) : undefined);
  const ua = String(req.headers["user-agent"] ?? "");
  const browser = /CriOS|Chrome/.test(ua) ? "chrome" : /FxiOS|Firefox/.test(ua) ? "firefox" : /Safari/.test(ua) ? "safari" : "other";
  const device = /iPhone|iPad/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "desktop";
  req.log?.warn({
    event: "client.error",
    kind: text(b.kind, 20),
    message: typeof b.message === "string" ? b.message.slice(0, 300) : undefined,
    source: text(b.source, 160),
    line: Number.isFinite(b.line) ? b.line : undefined,
    stack: typeof b.stack === "string" ? b.stack.split("\n").slice(0, 4).map((l) => l.replace(/https?:\/\/[^/\s)]+/g, "").slice(0, 160)) : undefined,
    page: text(b.page, 120),
    browser, device,
  }, "A page crashed in a reader's browser");
  res.status(204).end();
});
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
// A malformed or oversized request body answers in JSON like every other API error, never with an HTML page
// (Express's default) that names the framework or echoes details.
app.use((err: { status?: number; statusCode?: number; type?: string }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) { next(err); return; }
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) req.log?.error({ err, event: "request.failed" }, "Unhandled request error");
  res.status(status).json({
    error: status === 413 ? "The request is too large." : status >= 500 ? "Something went wrong. Please try again." : "The request could not be read.",
  });
});

export default app;
