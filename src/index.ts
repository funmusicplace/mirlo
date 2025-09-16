import express from "express";
import swaggerUi from "swagger-ui-express";
import * as dotenv from "dotenv";
import {
  BullMQAdapter,
  createBullBoard,
  ExpressAdapter,
} from "@bull-board/express";

import auth from "./routers/auth";
import "./auth/passport";
import { imageQueue } from "./queues/processImages";
import { audioQueue } from "./queues/processTrackAudio";
import { serveStatic } from "./static";
import prisma from "@mirlo/prisma";
import { rateLimit } from "express-rate-limit";
import errorHandler from "./utils/error";
import { sendMailQueue } from "./queues/send-mail-queue";
import path from "node:path";
import parseIndex from "./parseIndex";
import wellKnown from "./wellKnown";
import logger from "./logger";
import apiApp from "./api";
import { corsCheck } from "./auth/cors";
import cookieParser from "cookie-parser";
import qs from "qs";
import { getSiteSettings } from "./utils/settings";
import { userAuthenticated, userHasPermission } from "./auth/passport";

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

app.use(express.static("public"));

app.use("/images/:bucket/:filename", serveStatic);

app.use("/admin/queues", async (req, res) => {
  console.log("req.user", req.user);
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
  // Basic logging for requests that aren't handled by the API or auth.
  if (
    !req.path.includes("/assets/") &&
    !req.path.includes("/static/") &&
    !req.path.startsWith("/fonts/")
  ) {
    // Don't log requests to static assets
    logger.info(
      `front-end request: ${req.method} ${req.path} - ${JSON.stringify(req.query)} - ${JSON.stringify(req.headers)}`
    );
  }
  next();
});

// This has to be the last thing used so that other things don't get over-written
app.use("/", async (req, res) => {
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
      const html = await parseIndex(req.path);
      res.send(html);
    } else {
      try {
        const fileLocation = path.join(
          __dirname,
          "..",
          "client",
          "dist",
          req.path
        );
        res.sendFile(fileLocation);
      } catch (e) {
        console.log(`didn't find that file`, req.path);
      }
    }
  }
});

app.use(errorHandler);

app.listen(process.env.PORT, () =>
  console.info(`
🚀 Server ready at: ${process.env.API_DOMAIN}`)
);

export default app;
