import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { findArtistIdForURLSlug } from "../../../../utils/artist";

const constructDateFilter = (
  sinceDate?: string,
  untilDate?: string
): { gte?: Date; lte?: Date } | undefined => {
  if (sinceDate && untilDate) {
    return { gte: new Date(sinceDate), lte: new Date(untilDate) };
  } else if (sinceDate) {
    return { gte: new Date(sinceDate) };
  } else if (untilDate) {
    return { lte: new Date(untilDate) };
  } else {
    return undefined;
  }
};

const querySupporters = (
  artistId: number[],
  sinceDate?: string,
  untilDate?: string
) => {
  const dateFilter = constructDateFilter(sinceDate, untilDate);
  return prisma.artistUserSubscriptionCharge.findMany({
    where: {
      artistUserSubscription: {
        amount: { gt: 0 },
        artistSubscriptionTier: {
          artistId: { in: artistId },
        },
      },
      createdAt: dateFilter,
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
};

const queryTips = (
  artistId: number[],
  sinceDate?: string,
  untilDate?: string
) => {
  const dateFilter = constructDateFilter(sinceDate, untilDate);

  return prisma.userArtistTip.findMany({
    where: {
      pricePaid: { gt: 0 },
      artistId: { in: artistId },
      datePurchased: dateFilter,
    },
    select: {
      artist: {
        select: {
          id: true,
          name: true,
          urlSlug: true,
          userId: true,
          user: { select: { currency: true } },
        },
      },
      pricePaid: true,
      datePurchased: true,
      artistTipTier: true,
      currencyPaid: true,
      userId: true,
    },
  });
};

const queryTracks = (
  artistId: number[],
  sinceDate?: string,
  untilDate?: string
) => {
  const dateFilter = constructDateFilter(sinceDate, untilDate);

  return prisma.userTrackPurchase.findMany({
    where: {
      pricePaid: { gt: 0 },
      datePurchased: dateFilter,
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
};

const queryUserTransactions = (
  artistId: number[],
  sinceDate?: string,
  untilDate?: string,
  trackGroupIds?: number[]
) => {
  const dateFilter = constructDateFilter(sinceDate, untilDate);

  return prisma.userTransaction.findMany({
    where: {
      amount: { gt: 0 },
      createdAt: dateFilter,
      trackGroupPurchases: {
        some: {
          trackGroupId: trackGroupIds ? { in: trackGroupIds } : undefined,
          trackGroup: {
            artistId: { in: artistId },
          },
        },
      },
    },
    select: {
      amount: true,
      currency: true,
      createdAt: true,
      userId: true,

      trackGroupPurchases: {
        select: {
          message: true,
          trackGroupId: true,
          trackGroup: {
            select: {
              artist: { select: { name: true, id: true, urlSlug: true } },
              title: true,
              urlSlug: true,
            },
          },
        },
      },
    },
  });
};

const queryMerch = (
  artistId: number[],
  sinceDate?: string,
  untilDate?: string
) => {
  const dateFilter = constructDateFilter(sinceDate, untilDate);

  return prisma.merchPurchase.findMany({
    where: {
      amountPaid: { gt: 0 },
      createdAt: dateFilter,
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
};

export const findSales = async ({
  artistId,
  sinceDate,
  untilDate,
  filters,
  orderBy,
}: {
  artistId: number[];
  sinceDate?: string;
  untilDate?: string;
  filters?: {
    trackGroupIds?: number[];
  };
  orderBy?: { datePurchased: "asc" | "desc" };
}) => {
  if (sinceDate) {
    const date = new Date(sinceDate);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
  }

  if (untilDate) {
    const date = new Date(untilDate);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
  }

  let supporters: Awaited<ReturnType<typeof querySupporters>> = [];
  let tips: Awaited<ReturnType<typeof queryTips>> = [];
  let trackPurchases: Awaited<ReturnType<typeof queryTracks>> = [];
  let userTransactions: Awaited<ReturnType<typeof queryUserTransactions>> = [];
  let merchPurchases: Awaited<ReturnType<typeof queryMerch>> = [];
  if (!filters) {
    supporters = await querySupporters(artistId, sinceDate, untilDate);

    tips = await queryTips(artistId, sinceDate, untilDate);

    trackPurchases = await queryTracks(artistId, sinceDate, untilDate);

    userTransactions = await queryUserTransactions(
      artistId,
      sinceDate,
      untilDate
    );

    merchPurchases = await queryMerch(artistId, sinceDate, untilDate);
  } else if (filters.trackGroupIds) {
    userTransactions = await queryUserTransactions(
      artistId,
      sinceDate,
      untilDate,
      filters.trackGroupIds
    );
  }

  return [
    ...supporters.map((s) => ({
      ...s,
      artist: [s.artistUserSubscription.artistSubscriptionTier.artist],
      amount: s.artistUserSubscription.amount,
      artistSubscriptionTier: s.artistUserSubscription.artistSubscriptionTier,
      title: `${s.artistUserSubscription.artistSubscriptionTier.name}`,
      datePurchased: s.createdAt,
      userId: s.artistUserSubscription.userId,
      currency: s.artistUserSubscription.currency,
      saleType: "subscription",
    })),
    ...tips.map((t) => ({
      ...t,
      artist: [t.artist],
      amount: t.pricePaid,
      currency: t.currencyPaid,
      title: `Tip`,
      saleType: "tip",
    })),
    ...trackPurchases.map((tp) => ({
      ...tp,
      urlSlug: tp.track.urlSlug,
      artist: [tp.track.trackGroup.artist],
      amount: tp.pricePaid,
      currency: tp.currencyPaid,
      title: tp.track.title,
      saleType: "track",
    })),
    ...userTransactions.map((ut) => ({
      ...ut,
      datePurchased: ut.createdAt,
      title: ut.trackGroupPurchases
        .map((tgp) => tgp.trackGroup.title)
        .join(", "),
      artist: ut.trackGroupPurchases.map((tgp) => tgp.trackGroup.artist),
      urlSlug: ut.trackGroupPurchases
        .map((tgp) => tgp.trackGroup.urlSlug)
        .join(", "),
      amount: ut.amount,
      currency: ut.currency,
      saleType: "transaction",
    })),
    ...merchPurchases.map((mp) => ({
      ...mp,
      title: mp.merch.title,
      artist: [mp.merch.artist],
      datePurchased: mp.createdAt,
      amount: mp.amountPaid,
      urlSlug: mp.merch.urlSlug,
      currency: mp.currencyPaid,
      saleType: "merch",
    })),
  ].sort((a, b) => {
    if (orderBy?.datePurchased === "asc") {
      return (
        new Date(a.datePurchased).getTime() -
        new Date(b.datePurchased).getTime()
      );
    }
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

      if (typeof trackGroupIds === "string") {
        // If trackGroupIds is a string, split it into an array
        trackGroupIds = trackGroupIds.split(",");
      }

      const results = await findSales({
        artistId: [Number(parsedId)],
        sinceDate: sinceDate as string,
        filters: trackGroupIds
          ? {
              trackGroupIds: trackGroupIds.map((id) => Number(id)),
            }
          : undefined,
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
    summary: "Returns supporters of this artist",
    responses: {
      200: {
        description: "A list of supporters of this artist",
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
