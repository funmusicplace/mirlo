import prisma from "@mirlo/prisma";
import { SubscriptionDeleteReason } from "@mirlo/prisma/client";
import { Job } from "bullmq";
import { groupBy, keyBy, uniq } from "lodash";

import logger from "../logger";
import { findSales } from "../routers/v1/artists/{id}/supporters";
import { getClient } from "../utils/getClient";

import sendMail from "./send-mail";

export type MonthlyIncomeReportEmailType = {
  user: { name: string; email: string };
  userSales: {
    artist: { name: string; id: number }[];
    datePurchased: string;
    saleType: string;
    title: string;
    user: { name: string; email: string };
    currency: string;
    amount: number;
    artistUserSubscriptionCharges?: {
      artistUserSubscription?: { shippingAddress: true };
    }[];
  }[];
  cancelledSubscriptions: {
    amount: number;
    deleteReason: string | null;
    deleteReasonLabel: string;
    user: { name: string | null };
    artistSubscriptionTier: {
      name: string;
      artist: { user: { currency: string | null } };
    };
  }[];
  totalIncome: number;
};

const deleteReasonLabels: Record<SubscriptionDeleteReason, string> = {
  USER_CANCELLED: "Cancelled by supporter",
  PAYMENT_FAILURE: "Payment failed",
  USER_ACCOUNT_DELETED: "Account deleted",
  ADMIN_REMOVED: "Removed by an admin",
  TIER_SWITCHED: "Switched tiers", // filtered out of the report, listed for exhaustiveness
};

const sendOutMonthlyIncomeReport = async () => {
  try {
    const startOfLastMonth = new Date();
    startOfLastMonth.setDate(1);
    startOfLastMonth.setHours(0, 0, 0, 0);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    const endOfLastMonth = new Date(startOfLastMonth);
    endOfLastMonth.setMonth(endOfLastMonth.getMonth() + 1);
    const allArtists = await prisma.artist.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
        userId: true,
      },
    });

    const sales = await findSales({
      artistId: allArtists.map((artist) => artist.id),
      sinceDate: startOfLastMonth.toISOString(),
      untilDate: endOfLastMonth.toISOString(),
      orderBy: { datePurchased: "asc" },
    });

    // Only artists with sales last month receive a report, so buyers and
    // cancellations are both scoped to (and depend only on) `sales`.
    const [buyerRows, cancelledSubscriptions] = await Promise.all([
      // findSales doesn't return the buyer (the public supporters endpoint
      // uses it too, so it must not carry buyer PII) — look buyers up
      // separately.
      prisma.user.findMany({
        where: { id: { in: uniq(sales.map((sale) => sale.userId)) } },
        select: { id: true, name: true, email: true },
      }),
      // Subscriptions that ended last month. TIER_SWITCHED is excluded: the
      // supporter is still subscribed on another tier, so it isn't lost
      // income.
      prisma.artistUserSubscription.findMany({
        where: {
          deletedAt: { gte: startOfLastMonth, lt: endOfLastMonth },
          OR: [
            { deleteReason: null },
            { deleteReason: { not: "TIER_SWITCHED" } },
          ],
          artistSubscriptionTier: {
            artist: {
              deletedAt: null,
              userId: { in: uniq(sales.map((sale) => sale.artist[0].userId)) },
            },
          },
        },
        select: {
          amount: true,
          deleteReason: true,
          user: { select: { name: true } },
          artistSubscriptionTier: {
            select: {
              name: true,
              artist: {
                select: { userId: true, user: { select: { currency: true } } },
              },
            },
          },
        },
      }),
    ]);
    const buyers = keyBy(buyerRows, "id");
    const groupedCancellations = groupBy(
      cancelledSubscriptions.map((subscription) => ({
        ...subscription,
        deleteReasonLabel: subscription.deleteReason
          ? deleteReasonLabels[subscription.deleteReason]
          : "Cancelled",
      })),
      (subscription) => subscription.artistSubscriptionTier.artist.userId
    );

    const mappedArtists = keyBy(allArtists, "id");
    const clientUrl = (await getClient()).applicationUrl;

    const groupedSales = groupBy(sales, (a) => a.artist[0].userId);
    for (const [userId, userSales] of Object.entries(groupedSales)) {
      if (userSales.length === 0) {
        continue;
      }
      const artist = userSales[0].artist;
      const totalIncome = userSales.reduce((sum, sale) => sum + sale.amount, 0);

      const user = mappedArtists[Number(artist[0].id)]?.user;
      try {
        sendMail<MonthlyIncomeReportEmailType>({
          data: {
            template: "announce-monthly-income-report",
            message: {
              to: user.email,
            },
            locals: {
              user,
              userSales: userSales.map((sale) => ({
                ...sale,
                user: {
                  name: buyers[sale.userId]?.name || "A supporter",
                  email: buyers[sale.userId]?.email || "",
                },
              })),
              cancelledSubscriptions: groupedCancellations[userId] ?? [],
              totalIncome,
              host: process.env.API_DOMAIN,
              client: clientUrl,
            },
          },
        } as Job);
      } catch (error) {
        logger.error(
          `Error sending out monthly income report to artist ${userId} (${user.email})`,
          error
        );
      }
    }
    // const groupedSubscriptions = groupBy(allSubscriptions, "userId");
  } catch (error) {
    logger.error("Error sending out monthly receipts", error);
    throw error;
  }
};

export default sendOutMonthlyIncomeReport;
