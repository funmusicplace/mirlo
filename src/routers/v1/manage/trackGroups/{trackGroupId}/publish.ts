import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import { AppError, HttpCode } from "../../../../../utils/error";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";
import { notifyFollowersOfNewAlbum } from "../../../../../utils/trackGroup";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params;
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );
      const isCurrentlyPublished =
        trackGroup.publishedAt && trackGroup.publishedAt <= new Date();
      if (!isCurrentlyPublished) {
        const hasCover = Boolean(trackGroup?.cover?.url?.length);

        if (!hasCover) {
          throw new AppError({
            httpCode: HttpCode.BAD_REQUEST,
            description: "TrackGroup must have a cover before publishing",
          });
        }
      }

      const now = new Date();
      const updatedTrackgroup = await prisma.trackGroup.update({
        where: { id: Number(trackGroupId) || undefined },
        data: {
          publishedAt: isCurrentlyPublished ? null : now,
          ...(!isCurrentlyPublished &&
            !trackGroup.releaseDate && { releaseDate: now }),
        },
      });
      if (updatedTrackgroup.publishedAt && updatedTrackgroup.isPublic) {
        await notifyFollowersOfNewAlbum(updatedTrackgroup);
      }
      res.json(updatedTrackgroup);
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Toggles the publish state of a TrackGroup",
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
