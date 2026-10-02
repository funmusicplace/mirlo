import prisma from "@mirlo/prisma";
import { SubscriptionDeleteReason } from "@mirlo/prisma/client";
import { groupBy, keyBy, uniq } from "lodash";

import logger from "../logger";
import { findSales } from "../routers/v1/artists/{id}/supporters";
import { serializeProfileUserSubscription } from "../serializers/profileUserSubscription";
import { serializeUserTransaction } from "../serializers/userTransaction";
import { getClient } from "../utils/getClient";

import sendMail from "./send-mail";

type ReportSale = {
  artist: { name: string; id: number }[];
  datePurchased: string;
  saleType: string;
  title: string;
  user: { name: string; email: string };
  currency: string;
  amount: number;
  artistUserSubscriptionCharges?: {
    artistUserSubscription?: {
      artistSubscriptionTier: {
        name: string;
        interval: string;
      };
    };
  }[];
};

export type MonthlyIncomeReportEmailType = {
  user: { name: string; email: string };
  /** One-off sales: albums, tracks, merch and tips. */
  sales: (ReportSale & { saleTypeLabel: string })[];
  subscriptionPayments: ReportSale[];
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
  salesTotal: number;
  subscriptionTotal: number;
  totalIncome: number;
  /** Artists sell in a single currency, so one code labels every amount. */
  currency: string;
  host: string;
  client: string;
};

const deleteReasonLabels: Record<SubscriptionDeleteReason, string> = {
  USER_CANCELLED: "Cancelled by supporter",
  PAYMENT_FAILURE: "Payment failed",
  USER_ACCOUNT_DELETED: "Account deleted",
  ADMIN_REMOVED: "Removed by an admin",
  ARTIST_CANCELLED: "Cancelled by you",
  TIER_SWITCHED: "Switched tiers",
};

type Sale = Awaited<ReturnType<typeof findSales>>[number];

const isSubscriptionPayment = (sale: Sale) =>
  sale.profileUserSubscriptionCharges.length > 0;

const saleTypeLabel = (sale: Sale) => {
  if (sale.merchPurchases.length) return "Merch";
  if (sale.trackGroupPurchases.length) return "Album";
  if (sale.trackPurchases.length) return "Track";
  return "Tip";
};

const sumAmounts = (sales: { amount: number }[]) =>
  sales.reduce((sum, sale) => sum + sale.amount, 0);

const sendOutMonthlyIncomeReport = async () => {
  try {
    const startOfLastMonth = new Date();
    startOfLastMonth.setDate(1);
    startOfLastMonth.setHours(0, 0, 0, 0);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    const endOfLastMonth = new Date(startOfLastMonth);
    endOfLastMonth.setMonth(endOfLastMonth.getMonth() + 1);
    const allArtists = await prisma.profile.findMany({
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
      // income. An artist whose only news is a cancellation still gets a
      // report, so this isn't scoped to `sales`.
      prisma.profileUserSubscription.findMany({
        where: {
          deletedAt: { gte: startOfLastMonth, lt: endOfLastMonth },
          OR: [
            { deleteReason: null },
            { deleteReason: { not: "TIER_SWITCHED" } },
          ],
          profileSubscriptionTier: {
            profile: { deletedAt: null },
          },
        },
        select: {
          amount: true,
          deleteReason: true,
          user: { select: { name: true } },
          profileSubscriptionTier: {
            select: {
              name: true,
              profile: {
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
      (subscription) => subscription.profileSubscriptionTier.profile.userId
    );

    const artistUsers = keyBy(allArtists, "userId");
    const clientUrl = (await getClient()).applicationUrl;

    const groupedSales = groupBy(sales, (a) => a.artist[0].userId);
    const recipientIds = uniq([
      ...Object.keys(groupedSales),
      ...Object.keys(groupedCancellations),
    ]);
    for (const userId of recipientIds) {
      const userSales = groupedSales[userId] ?? [];
      const cancellations = groupedCancellations[userId] ?? [];
      const artistUser = artistUsers[userId]?.user;
      if (!artistUser) {
        continue;
      }

      const serializeSale = (sale: Sale) =>
        serializeUserTransaction({
          ...sale,
          user: {
            name: buyers[sale.userId]?.name || "A supporter",
            email: buyers[sale.userId]?.email || "",
          },
        });
      const oneOffSales = userSales.filter(
        (sale) => !isSubscriptionPayment(sale)
      );
      const subscriptionPayments = userSales.filter(isSubscriptionPayment);
      const salesTotal = sumAmounts(oneOffSales);
      const subscriptionTotal = sumAmounts(subscriptionPayments);

      // Ensure user.name is not null
      const user = { ...artistUser, name: artistUser.name || "" };
      try {
        await sendMail<MonthlyIncomeReportEmailType>({
          data: {
            template: "announce-monthly-income-report",
            message: {
              to: user.email,
            },
            locals: {
              user,
              sales: oneOffSales.map((sale) => ({
                ...serializeSale(sale),
                saleTypeLabel: saleTypeLabel(sale),
              })),
              subscriptionPayments: subscriptionPayments.map(serializeSale),
              cancelledSubscriptions: cancellations.map((subscription) =>
                serializeProfileUserSubscription(subscription)
              ),
              salesTotal,
              subscriptionTotal,
              totalIncome: salesTotal + subscriptionTotal,
              currency:
                userSales[0]?.currency ||
                cancellations[0]?.profileSubscriptionTier.profile.user
                  .currency ||
                "usd",
              host: process.env.API_DOMAIN || "",
              client: clientUrl,
            },
          },
        });
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
