import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { resolveBearer } from "./oauth";

export const MIRLO_API_KEY_HEADER = "mirlo-api-key";

// Keys from browsers and apps are public, so req.client is a claim, not
// proof. Use it for attribution only; never grant access based on it.
export const identifyClient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiHeader = req.headers[MIRLO_API_KEY_HEADER];
    const apiKey =
      typeof apiHeader === "string" && apiHeader ? apiHeader : undefined;

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
  } catch (e) {
    next(e);
  }
};
