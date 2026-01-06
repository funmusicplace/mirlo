import { NextFunction, Request, Response } from "express";
import {
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { chargePledgePayments } from "../../../../../utils/stripe";
import { sendMailQueue } from "../../../../../queues/send-mail-queue";

export default function () {
  const operations = {
    POST: [userAuthenticated, trackGroupBelongsToLoggedInUser, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId }: { trackGroupId?: string } = req.params;
    try {
      const pledgesForTrackGroups = await prisma.trackGroupPledge.findMany({
        where: {
          trackGroupId: Number(trackGroupId),
          paidAt: null,
          cancelledAt: null,
        },
        include: {
          user: true,
          trackGroup: { include: { artist: { include: { user: true } } } },
        },
      });

      if (!pledgesForTrackGroups.length) {
        return res
          .status(200)
          .json({ success: true, message: "No pledges to charge" });
      }

      for (const pledge of pledgesForTrackGroups) {
        // If the user already has a purchase for this track group, skip charging them
        // likely a weird edge case.
        const purchaseExists = await prisma.userTrackGroupPurchase.findFirst({
          where: {
            userId: pledge.userId,
            trackGroupId: pledge.trackGroupId,
          },
        });

        if (purchaseExists) {
          continue;
        }
        await chargePledgePayments(pledge);

        await prisma.trackGroupPledge.update({
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
            currency: pledge.trackGroup.currency ?? "usd",
            createdAt: new Date(),
          },
        });

        const purchase = await prisma.userTrackGroupPurchase.create({
          data: {
            userId: pledge.userId,
            trackGroupId: pledge.trackGroupId,
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
            artist: pledge.trackGroup.artist,
            email: encodeURIComponent(pledge.user.email),
            host: process.env.API_DOMAIN,
            trackGroup: pledge.trackGroup,
            currency: pledge.trackGroup.currency,
            pledgedAmountFormatted: pledge.amount / 100,
            fundraisingGoalFormatted:
              (pledge.trackGroup.fundraisingGoal ?? 0) / 100,
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
