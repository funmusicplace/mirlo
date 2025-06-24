import { flatten } from "lodash";
import prisma from "@mirlo/prisma";

import { Client } from "@mirlo/prisma/client";
import cors from "cors";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";

const isTest = process.env.NODE_ENV === "test" || process.env.CI;

export const corsCheck = async (...args: [Request, Response, NextFunction]) => {
  const [req, _res, next] = args;

  try {
    const apiHeader = req.headers["mirlo-api-key"];
    const isSameSite =
      req.headers["sec-fetch-site"] === "same-site" ||
      req.headers["sec-fetch-site"] === "same-origin";
    let clients: Client[] = [];
    if ((req.path === "/health" && req.headers["health-check"]) || isTest) {
      // do nothing
    } else {
      const isAPIEndpointPrivate =
        req.path.startsWith("/v1") &&
        !(
          req.path.startsWith("/v1/checkout") ||
          req.path.startsWith("/v1/webhooks") ||
          req.path.endsWith("/stripe/connect") ||
          req.path.endsWith("/stripe/connectComplete") ||
          // FIXME: This needs to be improved probably.
          // Exclude artist feed endpoints
          (req.path.startsWith("/v1/artists/") &&
            req.path.endsWith("/feed") &&
            req.query?.format === "rss") ||
          (req.path.startsWith("/v1/trackGroups") &&
            req.query?.format === "rss")
        );
      // We only care about the API key for API requests
      if (isSameSite || !isAPIEndpointPrivate) {
        clients = await prisma.client.findMany();
      } else if (!apiHeader || typeof apiHeader !== "string") {
        throw new AppError({
          httpCode: 401,
          description: "Missing API Code",
        });
      } else if (typeof apiHeader === "string" && !isSameSite) {
        clients = await prisma.client.findMany({
          where: {
            key: apiHeader,
          },
        });
      }
    }
    const origin = [
      ...flatten(
        clients.map((c) =>
          c.allowedCorsOrigins.map((origin) => {
            if (origin.startsWith("regex:")) {
              return new RegExp(origin.replace("regex:", ""));
            }
            return origin;
          })
        )
      ),
      process.env.API_DOMAIN ?? "http://localhost:3000",
    ];

    // if (process.env.NODE_ENV === "development") {
    //   origin.push("http://localhost:8080"); // Just... for ease of coding
    // }

    return cors({
      origin,
      credentials: true,
    })(...args);
  } catch (e) {
    next(e);
  }
};
