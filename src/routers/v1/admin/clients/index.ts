import { randomBytes } from "crypto";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { invalidateClientCache } from "../../../../auth/cors";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take } = req.query;
    try {
      const where: Prisma.ClientWhereInput = { deletedAt: null };

      const itemCount = await prisma.client.count({ where });
      const clients = await prisma.client.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: { createdAt: "desc" },
      });
      res.json({
        results: clients,
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { applicationName, applicationUrl, allowedCorsOrigins } =
      req.body as {
        applicationName: string;
        applicationUrl: string;
        allowedCorsOrigins?: string[];
      };
    try {
      if (!applicationName || !applicationUrl) {
        throw new AppError({
          httpCode: 400,
          description: "applicationName and applicationUrl are required",
        });
      }

      const client = await prisma.client.create({
        data: {
          applicationName,
          applicationUrl,
          allowedCorsOrigins: allowedCorsOrigins ?? [],
          key: randomBytes(24).toString("hex"),
        },
      });

      invalidateClientCache();

      res.json({ result: client });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Lists API clients",
    responses: { 200: { description: "success" } },
  };

  POST.apiDoc = {
    summary: "Creates a new API client and issues its key",
    responses: { 200: { description: "success" } },
  };

  return operations;
}
