import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await prisma.contentFlag.count({
        where: { resolvedAt: null },
      });

      res.json({ result: count });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Counts unresolved content flags",
    responses: {
      200: {
        description: "The number of unresolved content flags",
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
