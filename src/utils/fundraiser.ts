import prisma from "@mirlo/prisma";
import { FundraiserImage, Image, Prisma } from "@mirlo/prisma/client";
import { keyBy } from "lodash";

import { whereForVisibleProfile } from "./artist";
import { AppError } from "./error";
import generateSlug, { generateUniqueSlug } from "./generateSlug";
import { deleteStoredImages } from "./images";
import { findSales } from "./sales";
import { chargePledgePayments, pledgeChargeInclude } from "./stripe";

export const fundraiserImagesInclude = {
  include: { image: true },
  orderBy: { position: "asc" },
} satisfies Prisma.Fundraiser$imagesArgs;

export type FundraiserImageWithImage = FundraiserImage & { image: Image };

export const deleteFundraiserImages = async (fundraiserId: number) => {
  const images = await prisma.fundraiserImage.findMany({
    where: { fundraiserId },
    include: { image: true },
  });
  await deleteStoredImages(
    images.map((fundraiserImage) => fundraiserImage.image)
  );
};

const isNumericId = (value: string) => /^\d+$/.test(value);

export const whereForPublicFundraiser = ({
  idOrSlug,
  artistIdOrSlug,
  includeHiddenProfiles = false,
}: {
  idOrSlug: string;
  artistIdOrSlug?: string;
  includeHiddenProfiles?: boolean;
}): Prisma.FundraiserWhereInput => ({
  isPublic: true,
  profile: {
    ...(includeHiddenProfiles ? {} : whereForVisibleProfile()),
    ...(!artistIdOrSlug
      ? {}
      : isNumericId(artistIdOrSlug)
        ? { id: Number(artistIdOrSlug) }
        : { urlSlug: { equals: artistIdOrSlug, mode: "insensitive" } }),
  },
  OR: [
    ...(isNumericId(idOrSlug) ? [{ id: Number(idOrSlug) }] : []),
    ...(artistIdOrSlug
      ? [{ urlSlug: { equals: idOrSlug, mode: "insensitive" as const } }]
      : []),
  ],
});

const isFundraiserSlugTaken = async (
  profileId: number,
  urlSlug: string,
  excludeFundraiserId?: number
) =>
  Boolean(
    await prisma.fundraiser.findFirst({
      where: {
        profileId,
        urlSlug,
        ...(excludeFundraiserId ? { id: { not: excludeFundraiserId } } : {}),
      },
      select: { id: true },
    })
  );

export const generateUniqueFundraiserSlug = (profileId: number, name: string) =>
  generateUniqueSlug(name, "fundraiser", (urlSlug) =>
    isFundraiserSlugTaken(profileId, urlSlug)
  );

export const assertFundraiserSlugAvailable = async (
  fundraiser: { id: number; profileId: number },
  urlSlug: string
) => {
  const slug = generateSlug(urlSlug.trim());
  if (!slug) {
    throw new AppError({
      httpCode: 400,
      description: "The fundraiser URL can't be empty",
    });
  }
  if (await isFundraiserSlugTaken(fundraiser.profileId, slug, fundraiser.id)) {
    throw new AppError({
      httpCode: 400,
      description: "Another fundraiser already uses this URL",
    });
  }
  return slug;
};

type FundraiserForTotals = {
  id: number;
  profileId: number;
  isAllOrNothing: boolean;
  trackGroups: { id: number }[];
};

export const getFundraisersTotals = async (
  fundraisers: FundraiserForTotals[]
) => {
  const pledgeTotals = keyBy(
    await prisma.fundraiserPledge.groupBy({
      by: ["fundraiserId"],
      where: {
        fundraiserId: { in: fundraisers.map((fundraiser) => fundraiser.id) },
        cancelledAt: null,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    "fundraiserId"
  );

  return Promise.all(
    fundraisers.map(async (fundraiser) => {
      const pledges = pledgeTotals[fundraiser.id];
      const pledgeCount = pledges?._count._all ?? 0;

      if (fundraiser.isAllOrNothing || fundraiser.trackGroups.length === 0) {
        return { amountRaised: pledges?._sum.amount ?? 0, pledgeCount };
      }

      const sales = await findSales({
        profileId: [fundraiser.profileId],
        filters: { trackGroupIds: fundraiser.trackGroups.map((tg) => tg.id) },
      });

      return {
        amountRaised: sales.reduce((total, sale) => total + sale.amount, 0),
        pledgeCount,
      };
    })
  );
};

export const getFundraiserTotals = async (fundraiser: FundraiserForTotals) =>
  (await getFundraisersTotals([fundraiser]))[0];

/**
 * Charges every outstanding pledge on a fundraiser and marks it SUCCESSFUL.
 *
 * Refuses unless the fundraiser is ACTIVE and, for all-or-nothing
 * fundraisers, the pledged total has reached the goal.
 */
export const chargeFundraiserPledges = async (fundraiserId: number) => {
  const fundraiser = await prisma.fundraiser.findUnique({
    where: { id: fundraiserId },
  });

  if (!fundraiser) {
    throw new AppError({ httpCode: 404, description: "Fundraiser not found" });
  }

  if (fundraiser.status !== "ACTIVE") {
    throw new AppError({
      httpCode: 400,
      description: "This fundraiser is no longer active",
    });
  }

  if (fundraiser.isAllOrNothing) {
    const {
      _sum: { amount: pledgedTotal },
    } = await prisma.fundraiserPledge.aggregate({
      where: { fundraiserId, cancelledAt: null },
      _sum: { amount: true },
    });

    if ((pledgedTotal ?? 0) < fundraiser.goalAmount) {
      throw new AppError({
        httpCode: 400,
        description: "This fundraiser has not reached its goal yet",
      });
    }
  }

  // Mark the fundraiser SUCCESSFUL before charging, so a second request
  // can't charge the same pledges, and so future visitors get the regular
  // buy flow instead of the pledge flow (#1681).
  const claimed = await prisma.fundraiser.updateMany({
    where: { id: fundraiserId, status: "ACTIVE" },
    data: { status: "SUCCESSFUL" },
  });
  if (claimed.count === 0) {
    throw new AppError({
      httpCode: 409,
      description: "This fundraiser's pledges are already being charged",
    });
  }

  try {
    const pledgesForFundraiser = await prisma.fundraiserPledge.findMany({
      where: {
        fundraiserId,
        paidAt: null,
        cancelledAt: null,
        OR: [
          { associatedTransactionId: null },
          { associatedTransaction: { paymentStatus: "FAILED" } },
        ],
      },
      include: pledgeChargeInclude,
    });

    for (const pledge of pledgesForFundraiser) {
      // If the user already has a purchase for this track group, skip charging them
      // likely a weird edge case.
      const purchaseExists = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          userId: pledge.userId,
          trackGroupId: {
            in: pledge.fundraiser.trackGroups.map((tg) => tg.id),
          },
        },
      });

      if (purchaseExists) {
        continue;
      }

      await chargePledgePayments(pledge);
    }
  } catch (e) {
    await prisma.fundraiser.updateMany({
      where: { id: fundraiserId, status: "SUCCESSFUL" },
      data: { status: "ACTIVE" },
    });
    throw e;
  }
};
