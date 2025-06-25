import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { findArtistIdForURLSlug } from "../../../../utils/artist";

const findPurchases = async (artistId: number) => {
  const supporters = await prisma.artistUserSubscription.findMany({
    where: {
      amount: { gt: 0 },
      artistSubscriptionTier: {
        artistId: Number(artistId),
      },
    },
    select: {
      amount: true,
      createdAt: true,
      artistSubscriptionTier: true,
    },
  });

  const tips = await prisma.userArtistTip.findMany({
    where: {
      pricePaid: { gt: 0 },
      artistTipTier: {
        artistId: Number(artistId),
      },
    },
    select: {
      pricePaid: true,
      datePurchased: true,
      artistTipTier: true,
    },
  });

  const trackPurchases = await prisma.userTrackPurchase.findMany({
    where: {
      pricePaid: { gt: 0 },
      track: {
        trackGroup: {
          artistId: Number(artistId),
        },
      },
    },
    select: {
      pricePaid: true,
      datePurchased: true,
      track: {
        include: { trackGroup: true },
      },
    },
  });

  const trackGroupPurchases = await prisma.userTrackGroupPurchase.findMany({
    where: {
      pricePaid: { gt: 0 },
      trackGroup: {
        artistId: Number(artistId),
      },
    },
    select: {
      pricePaid: true,
      datePurchased: true,
      trackGroup: true,
    },
  });

  return [
    ...supporters.map((s) => ({
      ...s,
      amount: s.amount,
      datePurchased: s.createdAt,
    })),
    ...tips.map((t) => ({ ...t, amount: t.pricePaid })),
    ...trackPurchases.map((tp) => ({
      ...tp,
      amount: tp.pricePaid,
    })),
    ...trackGroupPurchases.map((tgp) => ({
      ...tgp,
      amount: tgp.pricePaid,
    })),
  ].sort((a, b) => {
    return (
      new Date(b.datePurchased).getTime() - new Date(a.datePurchased).getTime()
    );
  });
};

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response) {
    let { id }: { id?: string } = req.params;
    let { take = 20, skip = 0 } = req.query;

    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let artist;
      if (parsedId) {
        artist = await prisma.artist.findFirst({
          where: {
            id: Number(parsedId),
          },
          include: {
            subscriptionTiers: true,
          },
        });
      }

      if (!artist) {
        return res.status(404).json({
          error: "Artist not found",
        });
      }

      const results = await findPurchases(Number(parsedId));

      res.json({
        results: results.slice(Number(skip), Number(take)),
        total: results.length,
      });
    } catch (e) {
      console.error(`/v1/artists/{id}/followers ${e}`);
      res.status(400);
    }
  }

  GET.apiDoc = {
    summary: "Returns followers, primarily used for activityPub",
    responses: {
      200: {
        description: "A list of published posts",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Post",
          },
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
