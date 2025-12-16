import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  canUserCreateArtists,
  userAuthenticated,
} from "../../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import {
  addSizesToImage,
  getPlatformFeeForArtist,
} from "../../../../../../utils/artist";
import { finalImageBucket } from "../../../../../../utils/minio";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    GET: [
      userAuthenticated,
      canUserCreateArtists,
      artistBelongsToLoggedInUser,
      GET,
    ],
    POST: [
      userAuthenticated,
      canUserCreateArtists,
      artistBelongsToLoggedInUser,
      POST,
    ],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;
    const { includeDefault } = req.query as { includeDefault?: boolean };

    try {
      const subscriptions = await prisma.artistSubscriptionTier.findMany({
        where: {
          artistId: Number(artistId),
          ...(includeDefault ? {} : { isDefaultTier: false }),
        },
        orderBy: {
          minAmount: "asc",
        },
        include: {
          images: {
            include: { image: true },
          },
        },
      });

      res.status(200).json({
        results: subscriptions.map((s) => ({
          ...s,
          images: s.images.map((si) => ({
            ...si,
            image: addSizesToImage(finalImageBucket, si.image),
          })),
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response) {
    const { artistId } = req.params as unknown as Params;
    const user = req.user as User;

    try {
      const userForCurrency = await prisma.user.findFirst({
        where: { id: user.id },
        select: {
          currency: true,
          promoCodes: true,
        },
      });

      const {
        name,
        description,
        minAmount,
        maxAmount,
        interval,
        collectAddress,
        allowVariable,
        defaultAmount,
        autoPurchaseAlbums,
        imageId,
      } = req.body;
      const subscription = await prisma.artistSubscriptionTier.create({
        data: {
          name,
          artistId: Number(artistId),
          description,
          minAmount,
          collectAddress,
          maxAmount,
          interval,
          autoPurchaseAlbums,
          platformPercent: await getPlatformFeeForArtist(artistId),
          currency: userForCurrency?.currency ?? "usd",
          allowVariable,
          defaultAmount,
        },
      });
      if (imageId) {
        await prisma.subscriptionTierImage.deleteMany({
          where: {
            tierId: subscription.id,
          },
        });
        await prisma.subscriptionTierImage.create({
          data: {
            imageId: imageId,
            tierId: subscription.id,
          },
        });
      }
      res.json({ result: subscription });
    } catch (e) {
      res.status(500).json({
        error:
          "Something went wrong while trying to create a artistSubscriptionTier",
      });
    }
  }

  POST.apiDoc = {
    summary: "Creates a artistSubscriptionTier belonging to a user",
    parameters: [
      {
        in: "body",
        name: "subscription",
        schema: {
          $ref: "#/definitions/ArtistSubscriptionTierCreate",
        },
      },
    ],
    responses: {
      200: {
        description: "Created artistSubscriptionTier",
        schema: {
          $ref: "#/definitions/ArtistSubscriptionTierResult",
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
