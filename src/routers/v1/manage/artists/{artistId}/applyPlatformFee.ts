import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { AppError } from "../../../../../utils/error";

type Params = {
  artistId: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, artistBelongsToLoggedInUser, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;

    try {
      const artist = await prisma.artist.findFirst({
        where: { id: Number(artistId) },
        select: { id: true, defaultPlatformFee: true },
      });

      if (!artist) {
        throw new AppError({
          httpCode: 404,
          description: "Artist not found",
        });
      }

      const platformPercent = artist.defaultPlatformFee;

      if (platformPercent == null) {
        throw new AppError({
          httpCode: 400,
          description:
            "Artist has no defaultPlatformFee set; nothing to apply.",
        });
      }

      const [trackGroups, merch, subscriptionTiers, tipTiers] =
        await prisma.$transaction([
          prisma.trackGroup.updateMany({
            where: { artistId: artist.id },
            data: { platformPercent },
          }),
          prisma.merch.updateMany({
            where: { artistId: artist.id },
            data: { platformPercent },
          }),
          prisma.artistSubscriptionTier.updateMany({
            where: { artistId: artist.id },
            data: { platformPercent },
          }),
          prisma.artistTipTier.updateMany({
            where: { artistId: artist.id },
            data: { platformPercent },
          }),
        ]);

      res.json({
        result: {
          platformPercent,
          updated: {
            trackGroups: trackGroups.count,
            merch: merch.count,
            subscriptionTiers: subscriptionTiers.count,
            tipTiers: tipTiers.count,
          },
        },
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary:
      "Applies the artist's defaultPlatformFee to all of the artist's trackGroups, merch, subscription tiers, and tip tiers.",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Platform fee applied",
        schema: {
          type: "object",
          additionalProperties: true,
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
