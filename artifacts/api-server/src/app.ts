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
  ]),
);
// Without a secret key Clerk throws on every request, taking the public catalog down with it.
// Skip it instead: public routes keep working and account routes fail closed with 503.
if (process.env.CLERK_SECRET_KEY?.trim()) {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY || publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
} else {
  logger.error({ event: "auth.provider_unconfigured" }, "CLERK_SECRET_KEY is not set: sign-in and account routes are unavailable");
}
app.use("/api", bookatlasAccess);
app.use("/api", router);
app.use(await createApp());

export default app;
