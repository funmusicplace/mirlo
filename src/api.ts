import express from "express";
import { initialize } from "express-openapi";

import apiDoc from "./routers/v1/api-doc";
import "./auth/passport";

import errorHandler from "./utils/error";

import logger from "./logger";
import rateLimiter from "./rateLimiter";
import slowDown from "express-slow-down";
import routes from "./routes";
import qs from "qs";
import { corsCheck } from "./auth/cors";
import cookieParser from "cookie-parser";

const apiApp = express();
apiApp.set("query parser", (str: string) => qs.parse(str));
apiApp.use(corsCheck);
apiApp.use(cookieParser());
apiApp.use(express.urlencoded({ extended: true }));

apiApp.use(
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

apiApp.use(rateLimiter);
apiApp.use(
  slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 20, // allow 20 requests per minute, then start slowing down
    delayMs: () => 500, // add 500ms delay per request after the first
  })
);

apiApp.use((req, res, next) => {
  // Basic logging for API requests
  logger.info(
    `API: ${req.method} ${req.path} - ${JSON.stringify(req.query)} - ${JSON.stringify(req.headers)}`
  );
  next();
});

initialize({
  app: apiApp,
  apiDoc,
  // FIXME: it looks like express-openapi doesn't handle
  // typescript files very well.
  // https://github.com/kogosoftwarellc/open-api/issues/838
  // paths: "./src/routers/v1",
  // routesGlob: "**/*.{ts,js}",
  // routesIndexFileRegExp: /(?:index)?\.[tj]s$/,
  paths: routes.map((r) => ({
    path: "/" + r,
    module: require(`./routers/v1/${r}`),
  })),

  errorMiddleware: errorHandler,
});

export default apiApp;
