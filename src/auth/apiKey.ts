import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { isValidActivityPubEndpoint } from "../activityPub/utils";
import logger from "../logger";
import { AppError } from "../utils/error";

export const MIRLO_API_KEY_HEADER = "mirlo-api-key";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const isExcludedFromKeyCheck = (path: string, query?: { format?: string }) => {
  return (
    path.includes("/oembed") ||
    path.startsWith("/v1/checkout") ||
    path.startsWith("/v1/webhooks") ||
    path.endsWith("/stripe/connect") ||
    path.endsWith("/stripe/connectComplete") ||
    (path.startsWith("/v1/artists/") &&
      path.endsWith("/feed") &&
      query?.format === "rss") ||
    (path.startsWith("/v1/trackGroups") && query?.format === "rss") ||
    (path.startsWith("/v1/artists/") && path.endsWith("/confirmFollow"))
  );
};

export const apiKeyCheck = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // @ts-ignore - req.logger added by middleware
  const log = req.logger || logger;
  try {
    const isSameSite =
      req.headers["sec-fetch-site"] === "same-site" ||
      req.headers["sec-fetch-site"] === "same-origin";
    const isCORSPreflight =
      req.method === "OPTIONS" &&
      req.headers["access-control-request-method"] &&
      req.headers["access-control-request-headers"];
    const isMutatingRequest =
      req.path.startsWith("/v1") && !SAFE_METHODS.includes(req.method);
    const isActivityPub = isValidActivityPubEndpoint(req.path);
    const urlDoesNotRequireKey = isExcludedFromKeyCheck(req.path, req.query);

    log.debug("API Key check, will pass if any of these is true", {
      doesNotMutate: !isMutatingRequest,
      isSameSite,
      isCORSPreflight,
      isActivityPub,
      urlDoesNotRequireKey,
    });

    if (
      !isMutatingRequest ||
      isSameSite ||
      isCORSPreflight ||
      isActivityPub ||
      urlDoesNotRequireKey
    ) {
      log.debug("API check considered a safe method", req.path, req.query);
      // For safe methods, still try to identify the client for attribution
      // but don't require a key
      const apiHeader = req.headers[MIRLO_API_KEY_HEADER];
      if (typeof apiHeader === "string" && apiHeader) {
        const clients = await prisma.client.findMany({
          where: { key: apiHeader },
        });
        if (clients.length === 1) {
          req.client = clients[0];
        }
      }
      return next();
    }

    const apiHeader = req.headers[MIRLO_API_KEY_HEADER];
    if (typeof apiHeader !== "string" || !apiHeader) {
      throw new AppError({
        httpCode: 401,
        description: "Missing API key",
      });
    }

    log.info(`apiKeyCheck: Looking for client with API key: ${apiHeader}`);
    const clients = await prisma.client.findMany({
      where: { key: apiHeader },
    });
    log.info(
      `apiKeyCheck: Found ${clients.length} clients with that API key: ${clients
        .map((c) => `${c.applicationName}: ${c.allowedCorsOrigins.join(", ")}`)
        .join(", ")}`
    );

    if (clients.length !== 1) {
      throw new AppError({
        httpCode: 401,
        description: "Invalid API key",
      });
    }

    req.client = clients[0];
    return next();
  } catch (e) {
    next(e);
  }
};
