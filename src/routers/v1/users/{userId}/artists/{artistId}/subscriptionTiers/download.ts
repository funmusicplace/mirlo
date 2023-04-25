import { TrackAudio, Track, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../../auth/passport";
import prisma from "../../../../../../../../prisma/prisma";
import { downloadCSVFile } from "../../../../../../../utils/download";

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
  };

  // FIXME: only do published tracks
  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId }: { artistId?: string; userId?: string } = req.params;

    try {
      const subscribers = await prisma.artistUserSubscription.findMany({
        where: {
          artistSubscriptionTier: {
            artistId: Number(artistId),
          },
          deletedAt: null,
        },
        include: {
          user: true,
          artistSubscriptionTier: true,
        },
      });

      if (!subscribers) {
        res.status(404);
        return next();
      }

      return downloadCSVFile(
        res,
        "subscribers.csv",
        [
          {
            label: "Email",
            value: "user.email",
          },
          {
            label: "User",
            value: "user.name",
          },
          {
            label: "Amount",
            value: "amount",
          },
          {
            label: "Currency",
            value: "currency",
          },
          {
            label: "Subscription Tier ID",
            value: "artistSubscriptionTierId",
          },
          {
            label: "Subscription Tier Name",
            value: "artistSubscriptionTier.name",
          },
          {
            label: "Created At",
            value: "createdAt",
          },
          {
            label: "Updated At",
            value: "updatedAt",
          },
        ],
        subscribers
      );
    } catch (e) {
      console.error(
        "users/{userId}/artists/{artistId}/subscriptionTiers/download",
        e
      );
      res.status(500);
    }
  }

  GET.apiDoc = {
    summary: "Downloads an artists subscription list",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A trackGroup that matches the id",
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
