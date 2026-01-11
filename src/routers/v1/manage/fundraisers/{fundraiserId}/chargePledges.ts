import { NextFunction, Request, Response } from "express";
import {
  fundraiserBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { chargePledgePayments } from "../../../../../utils/stripe";
import { sendMailQueue } from "../../../../../queues/send-mail-queue";

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

        await prisma.fundraiserPledge.update({
          where: {
            id: pledge.id,
          },
          data: {
            paidAt: new Date(),
          },
        });

        const transaction = await prisma.userTransaction.create({
          data: {
            userId: pledge.userId,
            amount: pledge.amount,
            currency: trackGroup.currency ?? "usd",
            createdAt: new Date(),
            paymentStatus: "COMPLETED",
          },
        });

        const purchase = await prisma.userTrackGroupPurchase.create({
          data: {
            userId: pledge.userId,
            trackGroupId: trackGroup.id,
            createdAt: new Date(),
            userTransactionId: transaction.id,
          },
        });

        await sendMailQueue.add("send-mail", {
          template: "fundraiser-success",
          message: {
            to: pledge.user.email,
          },
          locals: {
            artist: trackGroup.artist,
            email: encodeURIComponent(pledge.user.email),
            host: process.env.API_DOMAIN,
            trackGroup: trackGroup,
            currency: trackGroup.currency,
            pledgedAmountFormatted: pledge.amount / 100,
            fundraisingGoalFormatted: (pledge.fundraiser.goalAmount ?? 0) / 100,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
          },
        });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
