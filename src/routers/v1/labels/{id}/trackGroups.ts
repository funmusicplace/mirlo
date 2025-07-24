import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { findUserIdForURLSlug } from "../../../../utils/user";

import {
  processSingleTrackGroup,
  whereForPublishedTrackGroups,
} from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;

    try {
      const userId = await findUserIdForURLSlug(id);
      const where = whereForPublishedTrackGroups();

      const trackGroups = await prisma.trackGroup.findMany({
        where: {
          ...where,
          OR: [{ paymentToUserId: userId }, { artist: { id: userId } }],
        },
        include: {
          cover: true,
          tracks: { orderBy: { order: "asc" }, where: { deletedAt: null } },
          artist: {
            select: {
              name: true,
              urlSlug: true,
              id: true,
            },
          },
        },
      });
      res.json({
        results: trackGroups.map(processSingleTrackGroup),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns label information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A label that matches the id",
        schema: {
          $ref: "#/definitions/User",
        },
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
