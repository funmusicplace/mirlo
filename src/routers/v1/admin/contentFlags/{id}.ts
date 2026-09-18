import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { serializeContentFlag } from "../../../../serializers/contentFlag";
import { contentFlagInclude } from "../../../../utils/contentFlag";
import { AppError } from "../../../../utils/error";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("admin"), PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as unknown as Params;
    const { resolved } = req.body as { resolved: boolean };

    try {
      assertLoggedIn(req);

      const flag = await prisma.contentFlag.findUnique({
        where: { id: Number(id) },
      });

      if (!flag) {
        throw new AppError({
          httpCode: 404,
          description: "Content flag not found",
        });
      }

      const updated = await prisma.contentFlag.update({
        where: { id: flag.id },
        data: resolved
          ? {
              resolvedAt: new Date(),
              resolvedByUserId: req.user.id,
              reporterEmail: null,
            }
          : { resolvedAt: null, resolvedByUserId: null },
        include: contentFlagInclude,
      });

      res.json({ result: serializeContentFlag(updated) });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Marks a content flag as resolved or unresolved",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "contentFlag",
        required: true,
        schema: {
          type: "object",
          required: ["resolved"],
          properties: {
            resolved: { type: "boolean" },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "The updated content flag",
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
