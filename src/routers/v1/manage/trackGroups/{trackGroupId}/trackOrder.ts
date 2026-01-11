import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";

type Params = {
  trackGroupId: number;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, trackGroupBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const { trackIds } = req.body;
    const loggedInUser = req.user as User;
    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );

      await Promise.all(
        trackIds.map(async (trackId: number, idx: number) => {
          await prisma.track.update({
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
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates track order belonging to a trackGroup",
    parameters: [
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
