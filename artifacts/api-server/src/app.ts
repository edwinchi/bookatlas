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
  ]),
);
app.use(
  clerkMiddleware((req) => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use("/api", bookatlasAccess);
app.use("/api", router);
app.use(await createApp());

export default app;
