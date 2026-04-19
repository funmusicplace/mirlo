import { NextFunction, Request, Response } from "express";
import {
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";

type Params = {
  trackGroupId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, trackGroupBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const { isPreview } = req.body as { isPreview?: boolean };

    try {
      if (typeof isPreview !== "boolean") {
        res.status(400).json({ error: "isPreview (boolean) is required" });
        return;
      }

      await prisma.$transaction([
        prisma.track.updateMany({
          where: { trackGroupId: Number(trackGroupId) },
          data: { isPreview },
        }),
        prisma.trackGroup.update({
          where: { id: Number(trackGroupId) },
          data: { defaultIsPreview: isPreview },
        }),
      ]);

      const trackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(trackGroupId) },
        include: {
          tracks: {
            orderBy: { order: "asc" },
            where: { deletedAt: null },
          },
        },
      });

      res.json({ result: trackGroup });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Bulk-update isPreview on every track in a trackGroup",
    parameters: [
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "body",
        required: true,
        schema: {
          type: "object",
          required: ["isPreview"],
          properties: {
            isPreview: { type: "boolean" },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Updated trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
