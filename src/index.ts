import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import { initialize } from "express-openapi";
import swaggerUi from "swagger-ui-express";
import * as dotenv from "dotenv";
import {
  BullMQAdapter,
  createBullBoard,
  ExpressAdapter,
} from "@bull-board/express";

import apiDoc from "./routers/v1/api-doc";
import auth from "./routers/auth";
import "./auth/passport";
import { imageQueue } from "./utils/processImages";
import { audioQueue } from "./utils/processTrackAudio";
import { serveStatic } from "./static";
import prisma from "../prisma/prisma";
import { rateLimit } from "express-rate-limit";
import { corsCheck } from "./auth/cors";
import errorHandler from "./utils/error";

dotenv.config();

const app = express();

// See https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
app.set("trust proxy", 2);
app.get("/ip", (request, response) => response.send(request.ip));
app.get("/x-forwarded-for", (request, response) =>
  response.send(request.headers["x-forwarded-for"])
);

const isDev = process.env.NODE_ENV === "development";

if (!isDev) {
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  });

  app.use(limiter);
}

app.use(corsCheck);

app.use(
  express.json({
    limit: "5mb",
    verify: (req, res, buf) => {
      // See https://stackoverflow.com/a/70951912/154392
      // @ts-ignore
      req.rawBody = buf.toString();
    },
  })
);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

const routes = [
  "trackGroups",
  "trackGroups/{id}",
  "trackGroups/{id}/download",
  "trackGroups/{id}/purchase",
  "trackGroups/{id}/testOwns",
  "trackGroups/{id}/wishlist",
  "trackGroups/{id}/emailDownload",
  "tracks",
  "tracks/{id}",
  "tracks/{id}/stream/{segment}",
  "artists",
  "artists/{id}",
  "artists/{id}/subscribe",
  "artists/{id}/feed",
  "artists/{id}/follow",
  "artists/{id}/unfollow",
  "posts",
  "posts/{id}",
  "users",
  "users/{userId}",
  "users/{userId}/subscriptions",
  "users/{userId}/subscriptions/{subscriptionId}",
  "users/{userId}/purchases",
  "users/{userId}/wishlist",
  "users/{userId}/stripe/connect",
  "users/{userId}/stripe/checkAccountStatus",
  "users/{userId}/feed",
  "users/{userId}/artists",
  "users/{userId}/testExistence",
  "users/{userId}/artists/{artistId}",
  "users/{userId}/artists/{artistId}/banner",
  "users/{userId}/artists/{artistId}/avatar",
  "users/{userId}/artists/{artistId}/subscriptionTiers",
  "users/{userId}/artists/{artistId}/subscriptionTiers/download",
  "users/{userId}/artists/{artistId}/subscriptionTiers/{subscriptionTierId}",
  "users/{userId}/trackGroups",
  "users/{userId}/trackGroups/{trackGroupId}",
  "users/{userId}/trackGroups/{trackGroupId}/trackOrder",
  "users/{userId}/trackGroups/{trackGroupId}/publish",
  "users/{userId}/trackGroups/{trackGroupId}/cover",
  "users/{userId}/tracks",
  "users/{userId}/tracks/{trackId}/audio",
  "users/{userId}/tracks/{trackId}",
  "users/{userId}/posts/{postId}/publish",
  "users/{userId}/posts/{postId}",
  "users/{userId}/posts/drafts",
  "users/{userId}/posts",
  "checkout",
  "webhooks/stripe",
  "webhooks/stripe/connect",
  "jobs",
  "admin/tasks",
];

initialize({
  app,
  apiDoc,
  // FIXME: it looks like express-openapi doesn't handle
  // typescript files very well.
  // https://github.com/kogosoftwarellc/open-api/issues/838
  // paths: "./src/routers/v1",
  // routesGlob: "**/*.{ts,js}",
  // routesIndexFileRegExp: /(?:index)?\.[tj]s$/,
  paths: routes.map((r) => ({
    path: "/v1/" + r,
    module: require(`./routers/v1/${r}`),
  })),
  errorMiddleware: errorHandler,
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: `${process.env.API_DOMAIN ?? "http://localhost:3000"}/api-docs`,
    },
  })
);

if (!isDev) {
  // Set a rate limiter on all auth endpoints to be only 5 requests a minute
  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers,
  });

  app.use("/auth", authLimiter, auth);
} else {
  app.use("/auth", auth);
}

app.use(express.static("public"));

// TODO: figure this out, as it's would the app to run on one
// instance.
// app.use(function (req, res, next) {
//   res.sendFile(path.join(__dirname, "../", "public", "app.html"));
// });
app.use("/images/:bucket/:filename", serveStatic);
app.use("/audio", express.static("data/media/audio"));

// Setting up a bull worker dashboard
if (isDev) {
  const serverAdapter = new ExpressAdapter();
  createBullBoard({
    queues: [new BullMQAdapter(imageQueue), new BullMQAdapter(audioQueue)],
    serverAdapter: serverAdapter,
  });
  serverAdapter.setBasePath("/admin/queues");
  app.use("/admin/queues", serverAdapter.getRouter());
}

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

// This has to be the last thing used so that other things don't get over-written
app.use("/", (req, res) => {
  if (!res.headersSent) {
    if (req.url !== "/") {
      res.status(404).json({
        error: "Page not found",
      });
    } else {
      res.status(200).json({
        mirlo: "chirp",
      });
    }
  }
});

app.listen(process.env.PORT, () =>
  console.info(`
🚀 Server ready at: ${process.env.API_DOMAIN}`)
);

export default app;
