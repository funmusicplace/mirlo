import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { findArtistIdForURLSlug } from "../../../../utils/artist";

export const findSales = async (artistId: number[], sinceDate?: string) => {
  if (sinceDate) {
    const date = new Date(sinceDate);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
  }
  const supporters = await prisma.artistUserSubscriptionCharge.findMany({
    where: {
      artistUserSubscription: {
        amount: { gt: 0 },
        artistSubscriptionTier: {
          artistId: { in: artistId },
        },
      },
      createdAt: sinceDate ? { gte: new Date(sinceDate) } : undefined,
    },
    select: {
      artistUserSubscription: {
        select: {
          amount: true,
          currency: true,
          artistSubscriptionTier: { include: { artist: true } },
          userId: true,
        },
      },
      createdAt: true,
    },
  });

  const tips = await prisma.userArtistTip.findMany({
    where: {
      pricePaid: { gt: 0 },
      artistId: { in: artistId },
      datePurchased: sinceDate ? { gte: new Date(sinceDate) } : undefined,
    },
    select: {
      artist: { include: { user: { select: { currency: true } } } },
      pricePaid: true,
      datePurchased: true,
      artistTipTier: true,
      currencyPaid: true,
      userId: true,
    },
  });

  const trackPurchases = await prisma.userTrackPurchase.findMany({
    where: {
      pricePaid: { gt: 0 },
      datePurchased: sinceDate ? { gte: new Date(sinceDate) } : undefined,
      track: {
        trackGroup: {
          artistId: { in: artistId },
        },
      },
    },
    select: {
      userId: true,
      currencyPaid: true,
      pricePaid: true,
      datePurchased: true,
      track: {
        include: { trackGroup: { include: { artist: true } } },
      },
    },
  });

  const trackGroupPurchases = await prisma.userTrackGroupPurchase.findMany({
    where: {
      pricePaid: { gt: 0 },
      datePurchased: sinceDate ? { gte: new Date(sinceDate) } : undefined,
      trackGroup: {
        artistId: { in: artistId },
      },
    },
    select: {
      pricePaid: true,
      currencyPaid: true,
      datePurchased: true,
      trackGroup: { include: { artist: true } },
      userId: true,
    },
  });

  const merchPurchases = await prisma.merchPurchase.findMany({
    where: {
      amountPaid: { gt: 0 },
      createdAt: sinceDate ? { gte: new Date(sinceDate) } : undefined,
      merch: {
        artistId: { in: artistId },
      },
    },
    select: {
      amountPaid: true,
      currencyPaid: true,
      createdAt: true,
      merch: { include: { artist: true } },
      userId: true,
    },
  });

  return [
    ...supporters.map((s) => ({
      ...s,
      artist: s.artistUserSubscription.artistSubscriptionTier.artist,
      amount: s.artistUserSubscription.amount,
      artistSubscriptionTier: s.artistUserSubscription.artistSubscriptionTier,
      datePurchased: s.createdAt,
      userId: s.artistUserSubscription.userId,
      currency: s.artistUserSubscription.currency,
    })),
    ...tips.map((t) => ({
      ...t,
      amount: t.pricePaid,
      currency: t.currencyPaid,
    })),
    ...trackPurchases.map((tp) => ({
      ...tp,
      urlSlug: tp.track.urlSlug,
      artist: tp.track.trackGroup.artist,
      amount: tp.pricePaid,
      currency: tp.currencyPaid,
    })),
    ...trackGroupPurchases.map((tgp) => ({
      ...tgp,
      artist: tgp.trackGroup.artist,
      urlSlug: tgp.trackGroup.urlSlug,
      amount: tgp.pricePaid,
      currency: tgp.currencyPaid,
    })),
    ...merchPurchases.map((mp) => ({
      ...mp,
      artist: mp.merch.artist,
      datePurchased: mp.createdAt,
      amount: mp.amountPaid,
      urlSlug: mp.merch.urlSlug,
      currency: mp.currencyPaid,
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
    let { take = 20, skip = 0, sinceDate } = req.query;

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

      const results = await findSales([Number(parsedId)], sinceDate as string);

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
