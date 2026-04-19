import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";
import { AppError, HttpCode } from "../../../../../utils/error";

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

      const updatedTrackgroup = await prisma.trackGroup.update({
        where: { id: Number(trackGroupId) || undefined },
        data: {
          publishedAt: isCurrentlyPublished ? null : new Date(),
        },
      });
      if (updatedTrackgroup.publishedAt) {
        const artistFollowers = await prisma.artistUserSubscription.findMany({
          where: {
            artistSubscriptionTier: {
              artistId: updatedTrackgroup.artistId,
            },
          },
        });

        await prisma.notification.createMany({
          data: artistFollowers.map((follower) => {
            return {
              userId: follower.userId,
              trackGroupId: updatedTrackgroup.id,
              notificationType: "NEW_ARTIST_ALBUM",
            };
          }),
        });
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
