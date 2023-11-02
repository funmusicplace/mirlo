import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import processTrackGroupCover from "../../../../../../utils/processImages";
import prisma from "../../../../../../../prisma/prisma";
import { doesTrackGroupBelongToUser } from "../../../../../../utils/ownership";

type Params = {
  trackGroupId: number;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const { trackIds } = req.body;
    const loggedInUser = req.user as User;
    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser.id
      );

      if (!trackGroup) {
        res.status(401).json({
          error: "Trackgroup must belong to user",
        });
        return next();
      }

      await Promise.all(
        trackIds.map(async (trackId: number, idx: number) => {
          const track = await prisma.track.update({
            where: {
              trackGroupId: trackGroup.id,
              id: trackId,
            },
            data: {
              order: idx + 1,
            },
          });
        })
      );

      const updatedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
        include: {
          tracks: {
            orderBy: { order: "asc" },
            where: {
              deletedAt: null,
            },
          },
        },
      });

      res.json({ result: updatedTrackGroup });
    } catch (error) {
      console.error(
        "users/{userId}/trackGroups/{trackGroupId}/trackOrder",
        error
      );
      res.status(400).json({
        error: `TrackGroup with ID ${trackGroupId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup cover belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "trackIds",
        required: true,
        schema: {
          type: "object",
          required: ["trackIds"],
          properties: {
            trackIds: {
              type: "array",
              items: {
                type: "number",
              },
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Updated trackgroup",
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
