import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupIds } = req.body;
    try {
      await Promise.all(
        trackGroupIds.map(async (trackGroupId: number, idx: number) => {
          await prisma.trackGroup.update({
            where: {
              id: trackGroupId,
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

      res.json({ result: updatedTrackGroups });
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
