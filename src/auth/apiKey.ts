import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { isValidActivityPubEndpoint } from "../activityPub/utils";
import logger from "../logger";
import { AppError } from "../utils/error";

import { rejectBearer, resolveBearer } from "./oauth";

export const MIRLO_API_KEY_HEADER = "mirlo-api-key";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const isExcludedFromKeyCheck = (path: string, query?: { format?: string }) => {
  return (
    path.includes("/oembed") ||
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
  res: Response,
  next: NextFunction
) => {
  const log = req.logger || logger;
  try {
    const isSameSite =
      req.headers["sec-fetch-site"] === "same-site" ||
      req.headers["sec-fetch-site"] === "same-origin";
    const isCORSPreflight =
      req.method === "OPTIONS" &&
      req.headers["access-control-request-method"] &&
      req.headers["access-control-request-headers"];
    const apiHeader = req.headers[MIRLO_API_KEY_HEADER];
    const apiKey =
      typeof apiHeader === "string" && apiHeader ? apiHeader : undefined;
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
      if (apiKey) {
        const clients = await prisma.client.findMany({
          where: { key: apiKey, deletedAt: null, status: "approved" },
        });
        if (clients.length === 1) {
          req.client = clients[0];
        }
      } else {
        const bearer = await resolveBearer(req);
        if (bearer.status === "valid") {
          req.client = bearer.client;
        }
      }
      return next();
    }

    if (!apiKey) {
      const bearer = await resolveBearer(req);
      if (bearer.status === "invalid") {
        return rejectBearer(res, next, "invalid_token");
      }
      if (bearer.status === "none") {
        throw new AppError({
          httpCode: 401,
          description: "Missing API key",
        });
      }
      req.client = bearer.client;
      return next();
    }

    log.info(`apiKeyCheck: Looking for client with API key: ${apiKey}`);
    const clients = await prisma.client.findMany({
      where: { key: apiKey, deletedAt: null },
    });
    log.info(
      `apiKeyCheck: Found ${clients.length} clients with that API key: ${clients
        .map((c) => `${c.applicationName}: ${c.allowedCorsOrigins.join(", ")}`)
        .join(", ")}`
    );

    if (clients.length !== 1 || clients[0].status !== "approved") {
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
