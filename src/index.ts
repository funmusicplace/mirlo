import express from "express";
import cookieParser from "cookie-parser";
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
import { imageQueue } from "./queues/processImages";
import { audioQueue } from "./queues/processTrackAudio";
import { serveStatic } from "./static";
import prisma from "@mirlo/prisma";
import { rateLimit } from "express-rate-limit";
import { corsCheck } from "./auth/cors";
import errorHandler from "./utils/error";
import { sendMailQueue } from "./queues/send-mail-queue";
import path from "node:path";
import parseIndex from "./parseIndex";
import qs from "qs";
import wellKnown from "./wellKnown";

dotenv.config();

const app = express();
app.set("query parser", (str: string) => qs.parse(str));
// See https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
app.set("trust proxy", 2);
app.get("/ip", (request, response) => response.send(request.ip));
app.get("/x-forwarded-for", (request, response) =>
  response.send(request.headers["x-forwarded-for"])
);

const isDev = process.env.NODE_ENV === "development";

app.use(corsCheck);

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

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
// app.use(passport.initialize()); // Supposedly we don't need this anymore

if (!isDev) {
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 400, // 400 requests per minute, which is absurd, but one page load gets us 80
    // FIXME: is there a way to have this be determined on whether the user is logged in?
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  });

  app.use(limiter);
}

const routes = [
  "tags",
  "trackGroups",
  "trackGroups/topSold",
  "trackGroups/mostPlayed",
  "trackGroups/testExistence",
  "trackGroups/{id}",
  "trackGroups/{id}/download",
  "trackGroups/{id}/redeemCode",
  "trackGroups/{id}/purchase",
  "trackGroups/{id}/testOwns",
  "trackGroups/{id}/wishlist",
  "trackGroups/{id}/emailDownload",
  "trackGroups/{id}/generate",
  "playable",
  "settings/{setting}",
  "tracks",
  "tracks/topSold",
  "tracks/mostPlayed",
  "tracks/{id}",
  "tracks/{id}/audio",
  "tracks/{id}/purchase",
  "tracks/{id}/download",
  "tracks/{id}/generate",
  "tracks/{id}/testOwns",
  "tracks/{id}/favorite",
  "tracks/{id}/stream/{segment}",
  "artists",
  "artists/testExistence",
  "artists/{id}",
  "artists/{id}/subscribe",
  "artists/{id}/purchaseCatalogue",
  "artists/{id}/feed",
  "artists/{id}/follow",
  "artists/{id}/posts",
  "artists/{id}/followers",
  "artists/{id}/supporters",
  "artists/{id}/inbox",
  "artists/{id}/confirmFollow",
  "artists/{id}/unfollow",
  "artists/{id}/tip",
  "merch/{id}",
  "merch/{id}/purchase",
  "posts",
  "posts/{id}",
  "licenses",
  "labels",
  "labels/{id}",
  "users",
  "users/testExistence",
  "users/{userId}",
  "users/{userId}/confirmEmail",
  "users/{userId}/avatar",
  "users/{userId}/notifications",
  "users/{userId}/notifications/unreadCount",
  "users/{userId}/notifications/{notificationId}",
  "users/{userId}/purchases",
  "users/{userId}/wishlist",
  "users/{userId}/charges",
  "users/{userId}/stripe/connect",
  "users/{userId}/stripe/connectComplete",
  "users/{userId}/stripe/checkAccountStatus",
  "users/{userId}/feed",
  "manage/subscriptions",
  "manage/subscriptions/{subscriptionId}",
  "manage/artists",
  "manage/label",
  "manage/label/artists/{artistId}",
  "manage/artists/{artistId}",
  "manage/artists/{artistId}/trackGroups",
  "manage/artists/{artistId}/merch",
  "manage/artists/{artistId}/labels",
  "manage/artists/{artistId}/labels/{labelUserId}",
  "manage/artists/{artistId}/codes",
  "manage/artists/{artistId}/subscribers",
  "manage/artists/{artistId}/banner",
  "manage/artists/{artistId}/avatar",
  "manage/artists/{artistId}/drafts",
  "manage/artists/{artistId}/subscriptionTiers",
  "manage/artists/{artistId}/subscriptionTiers/{subscriptionTierId}",
  "manage/trackGroups/{trackGroupId}",
  "manage/trackGroups/{trackGroupId}/trackOrder",
  "manage/trackGroups/{trackGroupId}/publish",
  "manage/trackGroups/{trackGroupId}/tags",
  "manage/trackGroups/{trackGroupId}/cover",
  "manage/trackGroups/{trackGroupId}/codes",
  "manage/merch/{merchId}",
  "manage/merch/{merchId}/image",
  "manage/merch/{merchId}/destinations",
  "manage/merch/{merchId}/optionTypes",
  "manage/purchases",
  "manage/purchases/{purchaseId}",
  "manage/purchases/{purchaseId}/contactArtist",
  "manage/sales",
  "manage/tracks",
  "manage/tracks/{trackId}/audio",
  "manage/tracks/{trackId}/downloadOriginal",
  "manage/tracks/{trackId}",
  "manage/tracks/{trackId}/trackArtists",
  "manage/posts/{postId}/images",
  "manage/posts/{postId}/tracks",
  "manage/posts/{postId}/featuredImage",
  "manage/posts/{postId}/publish",
  "manage/posts/{postId}",
  "manage/posts",
  "checkout",
  "checkout/status",
  "webhooks/stripe",
  "webhooks/stripe/connect",
  "jobs",
  "admin/tasks",
  "admin/tracks",
  "admin/trackGroups",
  "admin/artists",
  "admin/subscriptions",
  "admin/purchases",
  "admin/settings",
  "admin/tips",
  "admin/users",
  "admin/send-email",
  "oembed",
  "flag",
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
  // @ts-ignore
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
    limit: 50, // Limit each IP to 100 requests per `window`
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
// app.use("/audio", express.static("data/media/audio"));

// Setting up a bull worker dashboard
if (isDev) {
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
  app.use("/admin/queues", serverAdapter.getRouter());
}

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
