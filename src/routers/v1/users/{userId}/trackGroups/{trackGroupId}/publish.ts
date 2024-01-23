import { NextFunction, Request, Response } from "express";
import prisma from "../../../../../../../prisma/prisma";
import { userAuthenticated } from "../../../../../../auth/passport";
import { doesTrackGroupBelongToUser } from "../../../../../../utils/ownership";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId, userId } = req.params;
    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        Number(userId)
      );
      const updatedTrackgroup = await prisma.trackGroup.update({
        where: { id: Number(trackGroupId) || undefined },
        data: { published: !trackGroup?.published },
      });
      res.json(updatedTrackgroup);
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Toggles the publish state of a TrackGroup",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
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
