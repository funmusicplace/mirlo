import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  profileBelongsToLoggedInUser,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { processSingleTrackGroup } from "../../../../../serializers/trackGroup";

export default function () {
  const operations = {
    PUT: [userOrAppAuthenticated, profileBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupIds } = req.body;
    const profileId = Number(req.params.artistId);
    try {
      await Promise.all(
        trackGroupIds.map(async (trackGroupId: number, idx: number) => {
          await prisma.trackGroup.updateMany({
            where: {
              id: trackGroupId,
              profileId,
            },
            data: {
              orderIndex: idx + 1,
            },
          });
        })
      );

      const updatedTrackGroups = await prisma.trackGroup.findMany({
        where: {
          id: {
            in: trackGroupIds,
          },
          profileId,
        },
        include: {
          tracks: {
            orderBy: { order: "asc" },
            where: {
              deletedAt: null,
            },
          },
        },
      });

      res.json({
        result: updatedTrackGroups.map((tg) => processSingleTrackGroup(tg)),
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates the order of trackGroups",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "trackGroupIds",
        required: true,
        schema: {
          type: "object",
          required: ["trackGroupIds"],
          properties: {
            trackGroupIds: {
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
        description: "Updated trackgroups",
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
