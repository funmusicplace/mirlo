import { NextFunction, Request, Response } from "express";
import {
  fundraiserBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { chargePledgePayments } from "../../../../../utils/stripe";

export default function () {
  const operations = {
    POST: [userAuthenticated, fundraiserBelongsToLoggedInUser, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId }: { fundraiserId?: string } = req.params;
    try {
      const pledgesForFundraiser = await prisma.fundraiserPledge.findMany({
        where: {
          fundraiserId: Number(fundraiserId),
          paidAt: null,
          cancelledAt: null,
        },
        include: {
          user: true,
          fundraiser: {
            include: {
              trackGroups: { include: { artist: { include: { user: true } } } },
            },
          },
        },
      });

      if (!pledgesForFundraiser.length) {
        return res
          .status(200)
          .json({ success: true, message: "No pledges to charge" });
      }

      for (const pledge of pledgesForFundraiser) {
        // If the user already has a purchase for this track group, skip charging them
        // likely a weird edge case.
        const trackGroup = pledge.fundraiser.trackGroups[0];
        if (!trackGroup) {
          continue;
        }

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

      return res.status(200).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
