import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { findArtistIdForURLSlug } from "../../../../utils/artist";

const querySupporters = (artistId: number[], sinceDate?: string) =>
  prisma.artistUserSubscriptionCharge.findMany({
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

const queryTips = (artistId: number[], sinceDate?: string) =>
  prisma.userArtistTip.findMany({
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

const queryTracks = (artistId: number[], sinceDate?: string) =>
  prisma.userTrackPurchase.findMany({
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

const queryTrackGroups = (
  artistId: number[],
  sinceDate?: string,
  trackGroupIds?: number[]
) =>
  prisma.userTrackGroupPurchase.findMany({
    where: {
      pricePaid: { gt: 0 },
      datePurchased: sinceDate ? { gte: new Date(sinceDate) } : undefined,
      trackGroup: {
        id: { in: trackGroupIds },
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

const queryMerch = (artistId: number[], sinceDate?: string) =>
  prisma.merchPurchase.findMany({
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
      quantity: true,
      createdAt: true,
      shippingAddress: true,
      merch: {
        include: {
          artist: true,
          shippingDestinations: {
            select: { costUnit: true, destinationCountry: true },
          },
        },
      },
      userId: true,
    },
  });

export const findSales = async ({
  artistId,
  sinceDate,
  filters,
}: {
  artistId: number[];
  sinceDate?: string;
  filters?: {
    trackGroupIds?: number[];
  };
}) => {
  if (sinceDate) {
    const date = new Date(sinceDate);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
  }

  let supporters: Awaited<ReturnType<typeof querySupporters>> = [];
  let tips: Awaited<ReturnType<typeof queryTips>> = [];
  let trackPurchases: Awaited<ReturnType<typeof queryTracks>> = [];
  let trackGroupPurchases: Awaited<ReturnType<typeof queryTrackGroups>> = [];
  let merchPurchases: Awaited<ReturnType<typeof queryMerch>> = [];

  if (!filters) {
    supporters = await querySupporters(artistId, sinceDate);

    tips = await queryTips(artistId, sinceDate);

    trackPurchases = await queryTracks(artistId, sinceDate);

    trackGroupPurchases = await queryTrackGroups(artistId, sinceDate);

    merchPurchases = await queryMerch(artistId, sinceDate);
  } else if (filters.trackGroupIds) {
    trackGroupPurchases = await queryTrackGroups(
      artistId,
      sinceDate,
      filters.trackGroupIds
    );
  }

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
    let {
      take = 20,
      skip = 0,
      sinceDate,
      trackGroupIds,
    } = req.query as {
      take: number | string;
      skip: number | string;
      sinceDate?: string | undefined;
      artistIds?: string | string[] | number[] | undefined;
      trackGroupIds?: string | string[] | number[] | undefined;
    };

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

      if (!trackGroupIds) {
        trackGroupIds = (
          await prisma.trackGroup.findMany({
            where: {
              artistId: artist.id,
            },
          })
        ).map((tg) => tg.id);
      } else if (typeof trackGroupIds === "string") {
        // If trackGroupIds is a string, split it into an array
        trackGroupIds = trackGroupIds.split(",");
      }

      const results = await findSales({
        artistId: [Number(parsedId)],
        sinceDate: sinceDate as string,
        filters: {
          trackGroupIds: trackGroupIds.map((id) => Number(id)),
        },
      });

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
