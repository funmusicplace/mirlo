import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import { initialize } from "express-openapi";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();

import apiDoc from "./routers/v1/api-doc";
import {
  BullMQAdapter,
  createBullBoard,
  ExpressAdapter,
} from "@bull-board/express";

import auth from "./routers/auth";

import "./auth/passport";

import { imageQueue } from "./utils/processTrackGroupCover";
import { audioQueue } from "./utils/processTrackAudio";
import { flatten } from "lodash";

const prisma = new PrismaClient();
const app = express();

if (process.env.NODE_ENV === "development") {
  app.use(async (...args) => {
    const clients = await prisma.client.findMany();
    const origin = [
      ...flatten(clients.map((c) => c.allowedCorsOrigins)),
      process.env.API_DOMAIN ?? "http://localhost:3000",
    ];
    console.log("origin", origin);
    return cors({
      origin,
      credentials: true,
    })(...args);
  });
}

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

const routes = [
  "trackGroups",
  "trackGroups/{id}",
  "tracks",
  "tracks/{id}",
  "tracks/{id}/stream/{segment}",
  "artists",
  "artists/{id}",
  "posts",
  "posts/{id}",
  "users",
  "users/{userId}",
  "users/{userId}/artists",
  "users/{userId}/artists/{artistId}",
  "users/{userId}/artists/{artistId}/subscriptions",
  "users/{userId}/artists/{artistId}/subscriptions/{subscriptionId}",
  "users/{userId}/trackGroups",
  "users/{userId}/trackGroups/{trackGroupId}",
  "users/{userId}/trackGroups/{trackGroupId}/cover",
  "users/{userId}/tracks",
  "users/{userId}/tracks/{trackId}/audio",
  "users/{userId}/tracks/{trackId}",
  "users/{userId}/posts/{postId}/publish",
  "users/{userId}/posts/{postId}",
  "users/{userId}/posts/drafts",
  "users/{userId}/posts",
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
  errorMiddleware: (err, req, res, next) => {
    res.status(err.status).json({ errors: err.errors });
    next();
  },
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

app.use("/auth", auth);

// app.use("/", (req, res) => {
//   res.status(200).json({
//     hello: "world",
//   });
// });

app.use(express.static("public"));

// app.use(function (req, res, next) {
//   res.sendFile(path.join(__dirname, "../", "public", "app.html"));
// });
app.use("/images", express.static("data/media/images"));
app.use("/audio", express.static("data/media/audio"));

// Setting up a bull worker dashboard
if (process.env.NODE_ENV === "development") {
  const serverAdapter = new ExpressAdapter();
  createBullBoard({
    queues: [new BullMQAdapter(imageQueue), new BullMQAdapter(audioQueue)],
    serverAdapter: serverAdapter,
  });
  serverAdapter.setBasePath("/admin/queues");
  app.use("/admin/queues", serverAdapter.getRouter());
}

app.listen(process.env.PORT, () =>
  console.info(`
🚀 Server ready at: ${process.env.API_DOMAIN}`)
);
