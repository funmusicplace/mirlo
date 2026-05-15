import prisma from "@mirlo/prisma";
import { Client } from "@mirlo/prisma/client";
import cors from "cors";
import { NextFunction, Request, Response } from "express";

import logger from "../logger";
import { AppError } from "../utils/error";

const isTest = process.env.NODE_ENV === "test" || process.env.CI;
const MIRLO_API_KEY_HEADER = "mirlo-api-key";

const checkForPrivateEndpoint = (path: string, query?: { format?: string }) => {
  return (
    path.startsWith("/v1") &&
    !(
      path.includes("/oembed") ||
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

export const isValidActivityPubEndpoint = (path: string) => {
  return (
    /^\/v1\/ap\/artists\/[\w-]+(?:\/(?:outbox|followers|following|inbox|activities|posts|releases)(?:\/[\w-]+)?)?$/.test(
      path
    ) || /^\/.well-known\/(webfinger|nodeinfo)/.test(path)
  );
};

export const corsCheck = async (...args: [Request, Response, NextFunction]) => {
  const [req, _res, next] = args;
  // @ts-ignore - req.logger added by middleware
  const log = req.logger || logger;
  try {
    const isNotCors = req.headers["sec-fetch-mode"] === "no-cors";
    const isSameSite =
      req.headers["sec-fetch-site"] === "same-site" ||
      req.headers["sec-fetch-site"] === "same-origin";
    const isHealthCheck = req.path === "/health" && req.headers["health-check"];
    const isRSSFormat = req.query?.format === "rss";

    // Health checks, the test environment, and any RSS feed bypass both
    // client lookup and API-key validation entirely. CORS still applies (we
    // fall through to the cors() call below with an empty client list, so
    // only API_DOMAIN / dev localhost are in the origin allowlist)
    const skipsClientLookup = isHealthCheck || isTest || isRSSFormat;

    let clients: Client[] = [];
    if (!skipsClientLookup) {
      const isAPIEndpointPrivate = checkForPrivateEndpoint(req.path, req.query);

      // The API key is only required for cross-site requests to private
      // endpoints. Same-site (the SPA), public endpoints, and ActivityPub
      // endpoints all skip the key check; in those cases we still need every
      // registered client's allowed origins merged into the CORS allowlist,
      // so we load them all

      const isCORSPreflight =
        req.method === "OPTIONS" &&
        req.headers["access-control-request-method"] &&
        req.headers["access-control-request-headers"];
      let skipsApiKey =
        isNotCors ||
        isSameSite ||
        !isAPIEndpointPrivate ||
        isCORSPreflight ||
        isValidActivityPubEndpoint(req.path);
      const origin = req.get("origin");

      log.info(
        `CORS check for ${origin} ${req.method} ${req.path} - sameSite: ${isSameSite}, privateEndpoint: ${isAPIEndpointPrivate}, skipsApiKey: ${skipsApiKey}, isCorsPreflight: ${isCORSPreflight}`
      );

      if (origin) {
        const clientsThatMaySkipToken = await prisma.client.findMany({
          where: { allowedCorsOrigins: { has: origin }, skipStreamToken: true },
        });
        skipsApiKey ||= clientsThatMaySkipToken.length > 0;
        log.info(
          `Found clients that don't require token: ${clientsThatMaySkipToken.length}`
        );
      }

      log.info(
        "headers",
        req.headers["access-control-request-method"],
        req.headers["access-control-request-headers"]
      );

      if (skipsApiKey) {
        log.info(
          `${req.method} ${req.path} Skipping API key check for ${req.method} ${req.path}`
        );
        clients = await prisma.client.findMany();
      } else {
        const apiHeader = req.headers[MIRLO_API_KEY_HEADER];
        if (typeof apiHeader !== "string" || !apiHeader) {
          throw new AppError({
            httpCode: 401,
            description: "Missing API Code",
          });
        }
        log.info(`Looking for client with API key: ${apiHeader}`);
        clients = await prisma.client.findMany({
          where: { key: apiHeader },
        });
        log.info(
          `Found ${clients.length} clients with that API key: ${clients
            .map(
              (c) => `${c.applicationName}: ${c.allowedCorsOrigins.join(", ")}`
            )
            .join(", ")}`
        );
        if (clients.length === 1) {
          req.client = clients[0];
        }
      }
    }

    const allowedClientOrigins = clients.flatMap((c) =>
      c.allowedCorsOrigins.map((origin) =>
        origin.startsWith("regex:")
          ? new RegExp(origin.replace("regex:", ""))
          : origin
      )
    );

    const origin: (string | RegExp)[] = [
      ...allowedClientOrigins,
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
