import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { Request, Response } from "express";

import { findArtistIdForURLSlug } from "../../../../utils/artist";
import { toApiSaleResult } from "../../../../utils/serialize/apiNaming";

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

const queryUserTransactions = (
  profileId: number[],
  sinceDate?: string,
  untilDate?: string,
  trackGroupIds?: number[],
  // When set, also include sales whose payment is routed to this user via the
  // release's `paymentToUser` (e.g. a label that is the payee for a roster
  // artist's release it doesn't directly own). Mirrors the label trackGroups
  // endpoint so the label sees the sales it actually received money for.
  paymentToUserId?: number
) => {
  const dateFilter = constructDateFilter(sinceDate, untilDate);

  const or: Prisma.UserTransactionWhereInput[] = [
    {
      trackGroupPurchases: {
        some: {
          trackGroupId: trackGroupIds ? { in: trackGroupIds } : undefined,
          trackGroup: {
            profileId: { in: profileId },
          },
        },
      },
    },
    {
      merchPurchases: {
        some: {
          merch: {
            profileId: { in: profileId },
          },
        },
      },
    },
    {
      trackPurchases: {
        some: {
          track: {
            trackGroup: { profileId: { in: profileId } },
          },
        },
      },
    },
    {
      tips: {
        some: {
          profileId: {
            in: profileId,
          },
        },
      },
    },
    {
      profileUserSubscriptionCharges: {
        some: {
          profileUserSubscription: {
            profileSubscriptionTier: {
              profileId: { in: profileId },
            },
          },
        },
      },
    },
  ];

  if (paymentToUserId !== undefined) {
    // Only trackGroups and tracks carry a release-level `paymentToUser`; merch,
    // tips and subscriptions are always paid to the artist's own account, so a
    // label is never the payee for those.
    or.push(
      {
        trackGroupPurchases: {
          some: {
            trackGroupId: trackGroupIds ? { in: trackGroupIds } : undefined,
            trackGroup: { paymentToUserId },
          },
        },
      },
      {
        trackPurchases: {
          some: {
            track: {
              trackGroup: { paymentToUserId },
            },
          },
        },
      }
    );
  }

  return prisma.userTransaction.findMany({
    where: {
      amount: { gt: 0 },
      createdAt: dateFilter,
      OR: or,
    },
    select: {
      amount: true,
      currency: true,
      createdAt: true,
      userId: true,
      stripeCut: true,
      platformCut: true,
      shippingFeeAmount: true,
      userFriendlyId: true,
      stripeId: true,
      discountPercent: true,

      trackGroupPurchases: {
        select: {
          message: true,
          trackGroupId: true,
          trackGroup: {
            select: {
              profile: {
                select: { name: true, id: true, urlSlug: true, userId: true },
              },
              title: true,
              urlSlug: true,
            },
          },
        },
      },

      merchPurchases: {
        select: {
          merch: {
            select: {
              title: true,
              urlSlug: true,
              profile: {
                select: { name: true, id: true, urlSlug: true, userId: true },
              },
            },
          },
        },
      },

      tips: {
        select: {
          profile: {
            select: { name: true, id: true, urlSlug: true, userId: true },
          },
        },
      },

      profileUserSubscriptionCharges: {
        select: {
          profileUserSubscription: {
            select: {
              shippingAddress: true,
              profileSubscriptionTier: {
                select: {
                  name: true,
                  interval: true,
                  profile: {
                    select: {
                      name: true,
                      id: true,
                      urlSlug: true,
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      trackPurchases: {
        select: {
          track: {
            select: {
              title: true,
              id: true,
              urlSlug: true,
              trackGroup: {
                select: {
                  id: true,
                  urlSlug: true,
                  profile: {
                    select: {
                      name: true,
                      id: true,
                      urlSlug: true,
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
};

const generateTitle = (
  ut: Awaited<ReturnType<typeof queryUserTransactions>>[0]
) => {
  return (
    ut.trackGroupPurchases?.map((tgp) => tgp.trackGroup.title).join(", ") ||
    ut.merchPurchases?.map((mp) => mp.merch.title).join(", ") ||
    ut.trackPurchases?.map((tp) => tp.track.title).join(", ") ||
    (ut.tips ? "Tip" : "Transaction")
  );
};

export const findSales = async ({
  profileId,
  sinceDate,
  untilDate,
  filters,
  orderBy,
  paymentToUserId,
}: {
  profileId: number[];
  sinceDate?: string;
  untilDate?: string;
  filters?: {
    trackGroupIds?: number[];
  };
  orderBy?: { datePurchased: "asc" | "desc" };
  // Also include sales routed to this user as the release's payee (see
  // queryUserTransactions).
  paymentToUserId?: number;
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

  let userTransactions: Awaited<ReturnType<typeof queryUserTransactions>> = [];
  if (!filters) {
    userTransactions = await queryUserTransactions(
      profileId,
      sinceDate,
      untilDate,
      undefined,
      paymentToUserId
    );
  } else if (filters.trackGroupIds) {
    userTransactions = await queryUserTransactions(
      profileId,
      sinceDate,
      untilDate,
      filters.trackGroupIds,
      paymentToUserId
    );
  }

  return [
    ...userTransactions.map((ut) =>
      toApiSaleResult({
        ...ut,
        paymentProcessorCut: ut.stripeCut,
        // ISO string, not Date: consumers treat this as a string — the income
        // report template splits it on "T" without a JSON round-trip.
        datePurchased: ut.createdAt.toISOString(),
        title: generateTitle(ut),
        artist: [
          ut.trackGroupPurchases?.map((tgp) => tgp.trackGroup.profile),
          ut.merchPurchases?.map((mp) => mp.merch.profile),
          ut.trackPurchases?.map((tp) => tp.track.trackGroup.profile),
          ut.tips?.map((tip) => tip.profile),
          ut.profileUserSubscriptionCharges?.map(
            (asc) => asc.profileUserSubscription.profileSubscriptionTier.profile
          ),
        ].flat(),
        urlSlug: ut.trackGroupPurchases
          .map((tgp) => tgp.trackGroup.urlSlug)
          .join(", "),
        amount: ut.amount,
        currency: ut.currency,
        saleType: "transaction",
      })
    ),
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
        artist = await prisma.profile.findFirst({
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
        profileId: [Number(parsedId)],
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
