import { flatten } from "lodash";
import prisma from "@mirlo/prisma";

import { Client } from "@mirlo/prisma/client";
import cors from "cors";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";
import { headersAreForActivityPub } from "../activityPub/utils";

const isTest = process.env.NODE_ENV === "test" || process.env.CI;
const MIRLO_API_KEY_HEADER = "mirlo-api-key";

const checkForPrivateEndpoint = (path: string, query?: { format?: string }) => {
  return (
    path.startsWith("/v1") &&
    !(
      path.startsWith("/v1/checkout") ||
      path.startsWith("/v1/webhooks") ||
      path.endsWith("/stripe/connect") ||
      path.endsWith("/stripe/connectComplete") ||
      // FIXME: This needs to be improved probably.
      // Exclude artist feed endpoints
      (path.startsWith("/v1/artists/") &&
        path.endsWith("/feed") &&
        query?.format === "rss") ||
      (path.startsWith("/v1/trackGroups") && query?.format === "rss") ||
      // confirmFollow is public cause it comes from an email
      (path.startsWith("/v1/artists/") && path.endsWith("/confirmFollow"))
    )
  );
};

const isValidActivityPubEndpoints = (path: string) => {
  return /^\/v1\/artists\/[\w-]+(?:\/(?:feed|followers|following|confirmFollow))?$/.test(
    path
  );
};

export const corsCheck = async (...args: [Request, Response, NextFunction]) => {
  const [req, _res, next] = args;

  try {
    const apiHeader = req.headers[MIRLO_API_KEY_HEADER];
    const isSameSite =
      req.headers["sec-fetch-site"] === "same-site" ||
      req.headers["sec-fetch-site"] === "same-origin";

    const isHealthCheck = req.path === "/health" && req.headers["health-check"];
    const isRSSFormat = req.query?.format === "rss";

    let clients: Client[] = [];
    if (isHealthCheck || isTest || isRSSFormat) {
      // do nothing
    } else {
      const isAPIEndpointPrivate = checkForPrivateEndpoint(req.path, req.query);
      const isActivityPubRequest = headersAreForActivityPub(
        req.headers,
        "accept"
      );
      const validActivityPubEndpoints = isValidActivityPubEndpoints(req.path);
      // We only care about the API key for API requests
      if (isSameSite || !isAPIEndpointPrivate) {
        clients = await prisma.client.findMany();
      } else if (isActivityPubRequest && validActivityPubEndpoints) {
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

    if (process.env.NODE_ENV === "development") {
      origin.push("http://localhost:8080"); // Just... for ease of coding
    }

    return cors({
      origin,
      credentials: true,
    })(...args);
  } catch (e) {
    next(e);
  }
};
