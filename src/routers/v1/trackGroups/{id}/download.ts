import { TrackAudio, Track, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { logger } from "../../../../logger";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import { doesTrackGroupBelongToUser } from "../../../../utils/ownership";
import { buildZipFileForPath } from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { id: userId } = req.user as User;

    try {
      const isCreator = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        userId,
      );

      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: Number(trackGroupId),
          ...(!isCreator
            ? {
                userId: Number(userId),
                trackGroup: {
                  published: true,
                },
              }
            : {}),
        },
        include: {
          trackGroup: {
            include: {
              tracks: {
                include: {
                  audio: true,
                },
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      if (!purchase) {
        res.status(404);
        return next();
      }
      const zip = await buildZipFileForPath(
        // FIXME: why is this being picky about typing?
        purchase.trackGroup.tracks as unknown as (Track & {
          audio: TrackAudio | null;
        })[],
        purchase.trackGroup.id.toString(),
      );

      logger.info(`Put zip in location ${zip}`);

      res.sendFile(zip);
    } catch (e) {
      console.error("trackGroups/{id}/download", e);
      res.status(500);
      res.send({
        error: "Error downloading trackGroup",
      });
    }
  }

  GET.apiDoc = {
    summary: "Downloads a trackGroup file if the user has permission",
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
        description: "A zip file of trackgroup tracks",
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
