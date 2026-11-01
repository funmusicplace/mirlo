import prisma from "@mirlo/prisma";

import { AppError } from "./error";
import { chargePledgePayments, pledgeChargeInclude } from "./stripe";

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
        trackGroupId: { in: pledge.fundraiser.trackGroups.map((tg) => tg.id) },
      },
    });

    if (purchaseExists) {
      continue;
    }

    await chargePledgePayments(pledge);
  }
};
