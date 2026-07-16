import { randomBytes } from "crypto";

import prisma from "@mirlo/prisma";
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
    PUT: [userAuthenticated, userHasPermission("admin"), PUT],
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function findClientOr404(id: number) {
    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!client) {
      throw new AppError({ httpCode: 404, description: "Client not found" });
    }
    return client;
  }

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await findClientOr404(Number(req.params.id));
      res.json({ result: client });
    } catch (e) {
      next(e);
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { applicationName, applicationUrl, allowedCorsOrigins, rotateKey } =
      req.body as {
        applicationName?: string;
        applicationUrl?: string;
        allowedCorsOrigins?: string[];
        rotateKey?: boolean;
      };
    try {
      await findClientOr404(Number(req.params.id));

      const client = await prisma.client.update({
        where: { id: Number(req.params.id) },
        data: {
          applicationName,
          applicationUrl,
          allowedCorsOrigins,
          key: rotateKey ? randomBytes(24).toString("hex") : undefined,
        },
      });

      invalidateClientCache();

      res.json({ result: client });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      await findClientOr404(Number(req.params.id));

      await prisma.client.update({
        where: { id: Number(req.params.id) },
        data: { deletedAt: new Date() },
      });

      invalidateClientCache();

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Gets a single API client",
    responses: { 200: { description: "success" } },
  };

  PUT.apiDoc = {
    summary: "Updates an API client, optionally rotating its key",
    responses: { 200: { description: "success" } },
  };

  DELETE.apiDoc = {
    summary: "Soft-deletes an API client",
    responses: { 200: { description: "success" } },
  };

  return operations;
}
