import path from "node:path";

import { ExpressAdapter } from "@bull-board/express";
import prisma from "@mirlo/prisma";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import qs from "qs";
import swaggerUi from "swagger-ui-express";

import apiApp from "./api";
import "./auth/passport";
import { corsCheck } from "./auth/cors";
import { userLoggedInWithoutRedirect } from "./auth/passport";
import logger from "./logger";
import parseIndex from "./parseIndex";
import { imageQueue } from "./queues/processImages";
import { audioQueue } from "./queues/processTrackAudio";
import { sendMailQueue } from "./queues/send-mail-queue";
import auth from "./routers/auth";
import { serveStatic } from "./static";
import errorHandler from "./utils/error";
import { setCdnUrl } from "./utils/images";
import { sanitizeHeadersForLogs } from "./utils/requestLogging";
import { getSiteSettings } from "./utils/settings";
import wellKnown from "./wellKnown";

const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");

dotenv.config();

const app = express();
const isDev = process.env.NODE_ENV === "development";

app.set("query parser", (str: string) => qs.parse(str));
// See https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
app.set("trust proxy", 2);

app.get("/ip", (request, response) => response.send(request.ip));
app.get("/x-forwarded-for", (request, response) =>
  response.send(request.headers["x-forwarded-for"])
);

app.use(corsCheck);
app.use(cookieParser());
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

app.use("/images/:bucket/:filename", serveStatic);

app.use("/admin/queues", async (req, res) => {
  const settings = await getSiteSettings();
  if (isDev || settings.showQueueDashboard) {
    const serverAdapter = new ExpressAdapter();
    createBullBoard({
      queues: [
        new BullMQAdapter(imageQueue),
        new BullMQAdapter(audioQueue),
        new BullMQAdapter(sendMailQueue),
      ],
      serverAdapter: serverAdapter,
    });
    serverAdapter.setBasePath("/admin/queues");
    await serverAdapter.getRouter()(req, res);
  } else {
    res.status(404);
  }
});

// Setting up a bull worker dashboard

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
]);

// This has to be the last thing used so that other things don't get over-written
app.use("/", userLoggedInWithoutRedirect, async (req, res, next) => {
  if (!res.headersSent) {
    if (req.path.startsWith("/v1")) {
      res.sendStatus(404);
    } else if (
      (req.path.includes("index.html") || req.path.startsWith("/")) &&
      !(
        req.path.includes(".css") ||
        req.path.includes(".js") ||
        req.path.includes(".svg") ||
        req.path.includes(".png") ||
        req.path.includes(".jpg") ||
        req.path.includes(".ico") ||
        req.path.includes(".webp") ||
        req.path.includes(".md") ||
        req.path.includes(".pdf") ||
        req.path.includes(".woff") ||
        req.path.includes(".woff2") ||
        req.path.includes("robots.txt") ||
        req.path.startsWith("/static/")
      )
    ) {
      // HTML pages must never be cached — they reference hashed asset filenames
      res.setHeader("Cache-Control", "no-store");
      const html = await parseIndex(req.path, req);
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

        const fileErr = err as NodeJS.ErrnoException;

        if (fileErr.code === "ENOENT") {
          // During deploys or browser cache mismatch, hashed asset paths can 404.
          // Treat this as expected noise instead of an application error.
          if (req.path.startsWith("/assets/")) {
            logger.info(`asset not found: ${req.path}`);
          } else if (LOW_NOISE_PROBE_PATHS.has(req.path)) {
            logger.info(`probe path not found: ${req.path}`);
          }
          if (!res.headersSent) {
            res.sendStatus(404);
          }
          return;
        }

        next(err);
      });
    }
  }
});

app.use(errorHandler);

app.listen(process.env.PORT, async () => {
  const settings = await getSiteSettings();
  setCdnUrl(settings.cdnUrl ?? undefined);
  console.info(`
🚀 Server ready at: ${process.env.API_DOMAIN}`);
});

export default app;
