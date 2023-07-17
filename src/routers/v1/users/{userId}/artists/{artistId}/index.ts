import { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import prisma from "../../../../../../../prisma/prisma";
import { convertURLArrayToSizes } from "../../../../../../utils/images";
import { finalArtistBannerBucket } from "../../../../../../utils/minio";
import { deleteTrackGroup } from "../../../../../../utils/trackGroup";
import stripe from "../../../../../../utils/stripe";

type Params = {
  artistId: number;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response) {
    const { userId, artistId } = req.params as unknown as Params;
    const { bio, name } = req.body;

    try {
      const artist = await prisma.artist.updateMany({
        where: {
          id: Number(artistId),
          userId: Number(userId),
        },
        data: {
          bio,
          name,
        },
      });
      res.json(artist);
    } catch (error) {
      res.json({
        error: `Artist with ID ${artistId} does not exist for user ${userId}`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates an artist belonging to a user",
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
      {
        in: "body",
        name: "artist",
        schema: {
          $ref: "#/definitions/Artist",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated artist",
        schema: {
          $ref: "#/definitions/Artist",
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

  async function GET(req: Request, res: Response) {
    const { userId, artistId } = req.params as unknown as Params;
    if (userId) {
      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
          userId: Number(userId),
        },
        include: {
          banner: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      });
      res.json({
        result: {
          ...artist,
          banner: {
            ...artist?.banner,
            sizes: artist?.banner?.url
              ? convertURLArrayToSizes(
                  artist?.banner.url,
                  finalArtistBannerBucket
                )
              : undefined,
          },
        },
      });
    } else {
      res.status(400);
      res.json({
        error: "Invalid route",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns artist information that belongs to a user",
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
        description: "An artist that matches the id",
        schema: {
          $ref: "#/definitions/Artist",
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { userId, artistId } = req.params as unknown as Params;

    try {
      await prisma.artist.deleteMany({
        where: {
          id: Number(artistId),
          userId: Number(userId),
        },
      });

      // FIXME: We don't do cascading deletes because of the
      // soft deletion. That _could_ probably be put into a
      // a prisma middleware. This is a lot!
      // https://github.com/funmusicplace/mirlo/issues/19
      await prisma.post.deleteMany({
        where: {
          artistId: Number(artistId),
        },
      });

      await prisma.artistSubscriptionTier.deleteMany({
        where: {
          artistId: Number(artistId),
        },
      });

      const stripeSubscriptions = await prisma.artistUserSubscription.findMany({
        where: {
          artistSubscriptionTier: { artistId: Number(artistId) },
        },
      });
      await Promise.all(
        stripeSubscriptions.map(async (sub) => {
          if (sub.stripeSubscriptionKey) {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionKey);
          }
        })
      );
      await prisma.artistUserSubscription.deleteMany({
        where: {
          artistSubscriptionTier: { artistId: Number(artistId) },
        },
      });

      const trackGroups = await prisma.trackGroup.findMany({
        where: {
          artistId: Number(artistId),
        },
      });

      await Promise.all(trackGroups.map((tg) => deleteTrackGroup(tg.id)));
    } catch (e) {
      res.status(400);
      next();
    }
    res.json({ message: "Success" });
  }

  DELETE.apiDoc = {
    summary: "Deletes an Artist belonging to a user",
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
        description: "Delete success",
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
