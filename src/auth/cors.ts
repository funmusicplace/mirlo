import prisma from "@mirlo/prisma";
import { Client } from "@mirlo/prisma/client";
import cors from "cors";
import { NextFunction, Request, Response } from "express";

import logger from "../logger";

const isTest = process.env.NODE_ENV === "test" || process.env.CI;

const CACHE_TTL_MS = 60_000; // 1 minute
let cachedClients: Client[] = [];
let cacheExpiry = 0;

export const invalidateClientCache = () => {
  cacheExpiry = 0;
};

export const corsMiddleware = async (
  ...args: [Request, Response, NextFunction]
) => {
  const [req, , next] = args;
  // @ts-ignore - req.logger added by middleware
  const log = req.logger || logger;
  try {
    const isHealthCheck = req.path === "/health" && req.headers["health-check"];

    let clients: Client[] = [];
    if (!isHealthCheck && !isTest) {
      const now = Date.now();
      if (now > cacheExpiry) {
        cachedClients = await prisma.client.findMany();
        cacheExpiry = now + CACHE_TTL_MS;
      }
      clients = cachedClients;
    }

    const origin: (string | RegExp)[] = [
      ...clients.flatMap((c) =>
        c.allowedCorsOrigins.map((o) =>
          o.startsWith("regex:") ? new RegExp(o.replace("regex:", "")) : o
        )
      ),
      process.env.API_DOMAIN ?? "http://localhost:3000",
    ];

    if (process.env.NODE_ENV === "development") {
      origin.push("http://localhost:8080");
    }
    log.debug("Allowed origins", { origin });

    return cors({ origin, credentials: true })(...args);
  } catch (e) {
    next(e);
  }
};
