import path from "node:path";

import { ExpressAdapter } from "@bull-board/express";
import { integrateFederation } from "@fedify/express";
import prisma from "@mirlo/prisma";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { Request, Response, NextFunction } from "express-serve-static-core";
import qs from "qs";
import swaggerUi from "swagger-ui-express";

import { federation } from "./activityPub/federation";
import { isValidActivityPubEndpoint } from "./activityPub/utils";
import apiApp from "./api";
import "./auth/passport";
import { corsMiddleware } from "./auth/cors";
import {
  userAuthenticated,
  userHasPermission,
  userLoggedInWithoutRedirect,
} from "./auth/passport";
import logger from "./logger";
import parseIndex from "./parseIndex";
import { imageQueue } from "./queues/processImages";
import { audioQueue } from "./queues/processTrackAudio";
import { sendMailQueue } from "./queues/send-mail-queue";
import auth from "./routers/auth";
import { serveStatic } from "./static";
import errorHandler from "./utils/error";
import { setCdnUrl } from "./utils/images";
import {
  setBucketConfig,
  BucketConfig,
  ensureAllBucketsExist,
} from "./utils/minio";
import {
  attachRequestId,
  sanitizeHeadersForLogs,
} from "./utils/requestLogging";
import { getSiteSettings } from "./utils/settings";
import { refreshStripeClient } from "./utils/stripe";
import wellKnown from "./wellKnown";

const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");

const queueDashboardAdapter = new ExpressAdapter();
queueDashboardAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [
    new BullMQAdapter(imageQueue),
    new BullMQAdapter(audioQueue),
    new BullMQAdapter(sendMailQueue),
  ],
  serverAdapter: queueDashboardAdapter,
});

dotenv.config();

const app = express();
const isDev = process.env.NODE_ENV === "development";

const formatMb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

setInterval(() => {
  const mem = process.memoryUsage();
  logger.info(
    `memory:heartbeat: rss=${formatMb(mem.rss)} heapUsed=${formatMb(mem.heapUsed)} heapTotal=${formatMb(mem.heapTotal)} external=${formatMb(mem.external)}`
  );
}, 30_000).unref();

app.set("query parser", (str: string) => qs.parse(str));
// See https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
app.set("trust proxy", 2);

app.get("/ip", (request, response) => response.send(request.ip));
app.get("/x-forwarded-for", (request, response) =>
  response.send(request.headers["x-forwarded-for"])
);

app.use(attachRequestId);
app.use(corsMiddleware);
app.use(cookieParser());
// @fedify/express's fromERequest builds the request URL using req.host, which
// in Express returns the raw Host header including the port (e.g. "api:3000").
// Fedify's WebFinger domain check compares against that, so a resource like
// acct:user@api never matches api:3000.  req.hostname strips the port; patch
// req.host to use it so Fedify sees the hostname without port.
app.use((req, _res, next) => {
  const hostname = (req as any).hostname as string;
  Object.defineProperty(req, "host", {
    get: () => hostname,
    configurable: true,
  });
  next();
});
const federationMiddleware = integrateFederation(federation, () => undefined);
// Fedify's fromERequest calls Readable.toWeb(req) for all non-GET/HEAD
// requests, corrupting the stream for any route that reads the body (e.g.
// multipart uploads). Only run it on the paths it actually handles.
app.use((req, res, next) => {
  if (isValidActivityPubEndpoint(req.path)) {
    return federationMiddleware(req, res, next);
  }
  return next();
});
app.use(express.urlencoded({ extended: true }));

app.use(
  express.json({
    limit: "5mb",
    type: ["application/*+json", "application/json"],
    verify: (req, res, buf) => {
      // See https://stackoverflow.com/a/70951912/154392
      // @ts-ignore
      req.rawBody = buf.toString();
    },
  })
);

app.use("/v1", apiApp);

app.use(
  "/docs",
  // @ts-ignore
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: `${process.env.API_DOMAIN ?? "http://localhost:3000"}/v1/api-docs`,
    },
  })
);

if (!isDev) {
  // Set a rate limiter on all auth endpoints to be only 5 requests a minute
  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 50, // Limit each IP to 100 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers,
  });

  app.use("/auth", authLimiter, auth);
} else {
  app.use("/auth", auth);
}

app.use(express.static("public", { maxAge: "1y", immutable: true }));

// Note: only the bucket is a route param — in consolidated bucket mode the
// object key contains slashes (e.g. trackgroup-covers/<id>-x600.webp), so
// serveStatic reads the rest of the path itself.
app.use("/images/:bucket", serveStatic);

// Bull Board can mutate queues (retry/clean/pause). Require an admin session
// in addition to the showQueueDashboard setting so enabling the board is not
// a public unauthenticated surface.
app.use(
  "/admin/queues",
  userAuthenticated,
  userHasPermission("admin"),
  async (req, res, next) => {
    const settings = await getSiteSettings();
    if (!(isDev || settings.showQueueDashboard)) {
      res.status(404).end();
      return;
    }
    next();
  },
  queueDashboardAdapter.getRouter()
);

app.use(wellKnown);

// This has to be the last thing used so that other things don't get over-written
app.use("/health", async (req, res) => {
  try {
    await prisma.user.findMany({ take: 1 });
    res.status(200).json({
      mirlo: "healthy chirp",
    });
  } catch (e) {
    console.error(`health check failed ${e}`);
    res.status(500);
  }
});

app.use((req, res, next) => {
  if (isDev) {
    next();
    return;
  }
  // Basic logging for requests that aren't handled by the API or auth.
  if (
    !req.path.includes("/assets/") &&
    !req.path.includes("/static/") &&
    !req.path.startsWith("/fonts/")
  ) {
    // Don't log requests to static assets
    const sanitizedHeaders = sanitizeHeadersForLogs(req.headers);
    logger.info(
      `front-end request: ${req.method} ${req.path} - ${JSON.stringify(req.query)} - ${JSON.stringify(sanitizedHeaders)}`
    );
  }
  next();
});

const LOW_NOISE_PROBE_PATHS = new Set([
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env-config.js",
  "/.git/config",
  "/.git/HEAD",
  "/.aws/credentials",
  "/wp-login.php",
  "/wp-admin",
  "/.ssh/sftp-config.json",
  "/.vscode/sftp.json",
  "/.anthropic/config.json",
  "/.openai/config.json",
  "/.cursor/mcp.json",
  "/.vscode/launch.json",
  "/.vscode/settings.json",
  "/.prettierrc.json",
  "/.eslintrc.json",
  "/.well-known/jwks.json",
  "/.well-known/host-meta.json",
]);

const isHtmlPageRequest = (reqPath: string): boolean =>
  (reqPath.includes("index.html") || reqPath.startsWith("/")) &&
  !(
    reqPath.includes(".css") ||
    reqPath.includes(".js") ||
    reqPath.includes(".svg") ||
    reqPath.includes(".png") ||
    reqPath.includes(".jpg") ||
    reqPath.includes(".ico") ||
    reqPath.includes(".webp") ||
    reqPath.includes(".md") ||
    reqPath.includes(".pdf") ||
    reqPath.includes(".woff") ||
    reqPath.includes(".woff2") ||
    reqPath.includes("robots.txt") ||
    reqPath.startsWith("/static/") ||
    reqPath.startsWith("/v1")
  );

const htmlRateLimiter = isDev
  ? undefined
  : rateLimit({
      windowMs: 10 * 1000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => Boolean(req.user),
      handler: (_req, res) => {
        res.status(429).send("Too many requests");
      },
    });

const staticRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!htmlRateLimiter || !isHtmlPageRequest(req.path)) {
    return next();
  }
  return htmlRateLimiter(req, res, next);
};

// This has to be the last thing used so that other things don't get over-written
app.use(
  "/",
  userLoggedInWithoutRedirect,
  staticRateLimiter,
  async (req, res, next) => {
    if (!res.headersSent) {
      if (req.path.startsWith("/v1")) {
        res.sendStatus(404);
      } else if (isHtmlPageRequest(req.path)) {
        // HTML pages must never be cached — they reference hashed asset filenames
        res.setHeader("Cache-Control", "no-store");
        const memBefore = process.memoryUsage();
        const html = await parseIndex(req.path, req);
        const memAfter = process.memoryUsage();
        logger.info(
          `memory:parseIndex: path=${req.path} rss=${formatMb(memAfter.rss)} heapUsed=${formatMb(memAfter.heapUsed)} rssDelta=${formatMb(memAfter.rss - memBefore.rss)}`
        );
        res.send(html);
      } else {
        // Vite hashes /assets/ filenames on every build — safe to cache permanently
        // Other dist files (images, etc.) get 1 week with stale-while-revalidate
        if (req.path.startsWith("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader(
            "Cache-Control",
            "public, max-age=604800, stale-while-revalidate=604800"
          );
        }
        const fileLocation = path.join(
          __dirname,
          "..",
          "client",
          "dist",
          req.path
        );

        res.sendFile(fileLocation, (err) => {
          if (!err) {
            return;
          }

          const fileErr = err as NodeJS.ErrnoException & { status?: number };

          if (fileErr.code === "ENOENT" || fileErr.status === 404) {
            // Not finding a file during build is expected so shouldn't generate error noise.
            if (req.path.startsWith("/assets/")) {
              logger.info(`asset not found: ${req.path}`);
            } else if (LOW_NOISE_PROBE_PATHS.has(req.path)) {
              logger.info(`probe path not found: ${req.path}`);
            }
            if (!res.headersSent) {
              // Override the Cache-Control set above — a missing file must never be
              // cached, otherwise Cloudflare will serve the 404 for a year.
              res.setHeader("Cache-Control", "no-store");
              res.sendStatus(404);
            }
            return;
          }

          next(err);
        });
      }
    }
  }
);

app.use(errorHandler);

// Prevent unhandled async rejections (e.g. from Fedify's background queue)
// from crashing the process, especially during tests.
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled promise rejection: ${reason}`);
});

app.listen(process.env.PORT, async () => {
  const settings = await getSiteSettings();
  setCdnUrl(settings.cdnUrl ?? undefined);
  await refreshStripeClient();
  setBucketConfig((settings.bucketNames as BucketConfig | null) ?? null);
  ensureAllBucketsExist().catch((e) => {
    logger.error("Failed to eagerly create storage buckets on boot");
    logger.error(e);
  });
  console.info(`
🚀 Server ready at: ${process.env.API_DOMAIN}`);
});

export default app;
