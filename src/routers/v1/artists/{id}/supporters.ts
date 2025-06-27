import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { findArtistIdForURLSlug } from "../../../../utils/artist";

const findPurchases = async (artistId: number) => {
  const supporters = await prisma.artistUserSubscriptionCharge.findMany({
    where: {
      artistUserSubscription: {
        amount: { gt: 0 },
        artistSubscriptionTier: {
          artistId: artistId,
        },
      },
    },
    select: {
      artistUserSubscription: {
        select: { amount: true, artistSubscriptionTier: true, userId: true },
      },
      createdAt: true,
    },
  });

  const tips = await prisma.userArtistTip.findMany({
    where: {
      pricePaid: { gt: 0 },
      artistId: artistId,
    },
    select: {
      pricePaid: true,
      datePurchased: true,
      artistTipTier: true,
      userId: true,
    },
  });

  const trackPurchases = await prisma.userTrackPurchase.findMany({
    where: {
      pricePaid: { gt: 0 },
      track: {
        trackGroup: {
          artistId: artistId,
        },
      },
    },
    select: {
      userId: true,
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
      userId: true,
    },
  });

  return [
    ...supporters.map((s) => ({
      ...s,
      amount: s.artistUserSubscription.amount,
      artistSubscriptionTier: s.artistUserSubscription.artistSubscriptionTier,
      datePurchased: s.createdAt,
      userId: s.artistUserSubscription.userId,
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
        results: results.slice(Number(skip), Number(take)).map((r) => {
          // Strip user ids from results
          return {
            ...r,
            userId: undefined,
          };
        }),
        total: results.length,
        totalAmount: results.reduce((acc, curr) => acc + curr.amount, 0),
        totalSupporters: Object.keys(
          results.reduce(
            (acc, curr) => {
              if (acc[curr.userId]) {
                return acc;
              } else {
                return {
                  ...acc,
                  [curr.userId]: 1,
                };
              }
            },
            {} as Record<number, number>
          )
        ).length,
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
