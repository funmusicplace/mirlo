import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { getSiteSettings } from "../../../../../../utils/settings";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, artistBelongsToLoggedInUser, POST],
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
      });

      res.status(200).json({ results: subscriptions });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response) {
    const { artistId } = req.params as unknown as Params;
    const user = req.user as User;

    const settings = await getSiteSettings();

    try {
      const userForCurrency = await prisma.user.findFirst({
        where: { id: user.id },
        select: {
          currency: true,
          promoCodes: true,
        },
      });
      const userHasPromo = !!userForCurrency?.promoCodes.length;

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
          platformPercent: userHasPromo ? 0 : settings.platformPercent,
          currency: userForCurrency?.currency ?? "usd",
          allowVariable,
          defaultAmount,
        },
      });
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
