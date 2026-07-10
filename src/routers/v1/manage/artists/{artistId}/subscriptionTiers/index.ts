import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import {
  artistBelongsToLoggedInUser,
  canUserCreateArtists,
  userAuthenticated,
} from "../../../../../../auth/passport";
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
      const subscriptions = await prisma.profileSubscriptionTier.findMany({
        where: {
          profileId: Number(artistId),
          ...(includeDefault ? {} : { isDefaultTier: false }),
        },
        orderBy: {
          minAmount: "asc",
        },
        include: {
          images: {
            include: { image: true },
          },
          releases: {
            include: {
              trackGroup: {
                include: {
                  cover: true,
                  profile: true,
                },
              },
            },
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
    assertLoggedIn(req);
    const user = req.user;

    try {
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
        digitalDiscountPercent,
        merchDiscountPercent,
        imageId,
      } = req.body;
      const subscription = await prisma.profileSubscriptionTier.create({
        data: {
          name,
          profileId: Number(artistId),
          description,
          minAmount,
          collectAddress,
          maxAmount,
          interval,
          autoPurchaseAlbums,
          platformPercent: await getPlatformFeeForArtist(artistId),
          allowVariable,
          defaultAmount,
          digitalDiscountPercent,
          merchDiscountPercent,
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
          "Something went wrong while trying to create a profileSubscriptionTier",
      });
    }
  }

  POST.apiDoc = {
    summary: "Creates a profileSubscriptionTier belonging to a user",
    parameters: [
      {
        in: "body",
        name: "subscription",
        schema: {
          $ref: "#/definitions/ProfileSubscriptionTierCreate",
        },
      },
    ],
    responses: {
      200: {
        description: "Created profileSubscriptionTier",
        schema: {
          $ref: "#/definitions/ProfileSubscriptionTierResult",
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
