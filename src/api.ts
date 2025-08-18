import express from "express";
import { initialize } from "express-openapi";

import apiDoc from "./routers/v1/api-doc";
import "./auth/passport";

import errorHandler from "./utils/error";

import logger from "./logger";
import rateLimiter from "./rateLimiter";
import slowDown from "express-slow-down";
import routes from "./routes";

const apiApp = express();

apiApp.use(rateLimiter);
apiApp.use(
  slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 20, // allow 20 requests per minute, then start slowing down
    delayMs: () => 500, // add 500ms delay per request after the first
  })
);

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

apiApp.use((req, res, next) => {
  // Basic logging for API requests

  logger.info(
    `API request: ${req.method} ${req.path} - ${JSON.stringify(req.query)} - ${JSON.stringify(req.headers)}`
  );
  next();
});

export default apiApp;
