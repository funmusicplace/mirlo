import prisma from "@mirlo/prisma";

import { AppError } from "./error";
import { chargePledgePayments } from "./stripe";

/**
 * Charges every outstanding pledge on a fundraiser and marks it SUCCESSFUL.
 *
 * Refuses unless the fundraiser is ACTIVE and, for all-or-nothing
 * fundraisers, the pledged total has reached the goal. Pledges on
 * fundraisers whose release has been deleted are never charged.
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

  const pledgesForFundraiser = await prisma.fundraiserPledge.findMany({
    where: {
      fundraiserId,
      paidAt: null,
      cancelledAt: null,
    },
    include: {
      user: true,
      fundraiser: {
        include: {
          trackGroups: {
            // Nested includes aren't covered by the soft-delete extension
            where: { deletedAt: null },
            include: { profile: { include: { user: true } } },
          },
        },
      },
    },
  });

  for (const pledge of pledgesForFundraiser) {
    const trackGroup = pledge.fundraiser.trackGroups[0];
    if (!trackGroup) {
      continue;
    }

    // If the user already has a purchase for this track group, skip charging them
    // likely a weird edge case.
    const purchaseExists = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        userId: pledge.userId,
        trackGroupId: trackGroup.id,
      },
    });

    if (purchaseExists) {
      continue;
    }

    await chargePledgePayments(pledge);
  }

  // Mark the fundraiser SUCCESSFUL so future visitors get the regular
  // buy flow instead of the pledge flow (#1681).
  await prisma.fundraiser.update({
    where: { id: fundraiserId },
    data: { status: "SUCCESSFUL" },
  });
};
