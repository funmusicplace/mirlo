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
    const { id: userId, isAdmin } = req.user as User;

    try {
      const trackGroupInclude = {
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
      };

      let trackGroup;

      if (!isAdmin) {
        const isCreator = await doesTrackGroupBelongToUser(
          Number(trackGroupId),
          userId
        );
        logger.info(`trackGroupId: ${trackGroupId} isCreator: ${isCreator}`);

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
            trackGroup: trackGroupInclude,
          },
        });

        if (!purchase) {
          logger.info(`trackGroupId: ${trackGroupId} no purchase found `);
          res.status(404);
          return next();
        }
        trackGroup = purchase.trackGroup;
      } else {
        logger.info(`trackGroupId: ${trackGroupId} isAdmin `);
        trackGroup = await prisma.trackGroup.findFirst({
          where: {
            id: Number(trackGroupId),
          },
          ...trackGroupInclude,
        });
      }

      logger.info("Found a trackgroup");

      if (!trackGroup) {
        res.status(404);
        return next();
      }

      const zip = await buildZipFileForPath(
        // FIXME: why is this being picky about typing?
        trackGroup.tracks as unknown as (Track & {
          audio: TrackAudio | null;
        })[],
        trackGroup.id.toString()
      );

      logger.info(`Put zip at ${zip}`);
      res.set(
        "Content-Disposition",
        `attachment; filename="${trackGroup.title}"`
      );
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
