import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../../../auth/passport";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";
import { User } from "@mirlo/prisma/client";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params;
    const loggedInUser = req.user as User;

    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );
      const updatedTrackgroup = await prisma.trackGroup.update({
        where: { id: Number(trackGroupId) || undefined },
        data: { published: !trackGroup?.published },
      });
      if (updatedTrackgroup.published) {
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
