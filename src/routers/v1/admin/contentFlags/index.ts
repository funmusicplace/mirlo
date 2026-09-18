import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { serializeContentFlag } from "../../../../serializers/contentFlag";
import { contentFlagInclude } from "../../../../utils/contentFlag";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, resolved } = req.query;
    try {
      const where: Prisma.ContentFlagWhereInput = {};

      if (resolved === "true") {
        where.resolvedAt = { not: null };
      } else if (resolved === "false") {
        where.resolvedAt = null;
      }

      const total = await prisma.contentFlag.count({ where });
      const flags = await prisma.contentFlag.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: { createdAt: "desc" },
        include: contentFlagInclude,
      });

      res.json({
        results: flags.map((flag) => serializeContentFlag(flag)),
        total,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Lists flagged content",
    parameters: [
      {
        in: "query",
        name: "resolved",
        required: false,
        type: "string",
      },
      {
        in: "query",
        name: "skip",
        required: false,
        type: "string",
      },
      {
        in: "query",
        name: "take",
        required: false,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A list of content flags",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
