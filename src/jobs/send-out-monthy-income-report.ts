import prisma from "@mirlo/prisma";

import logger from "../logger";
import { findSales } from "../routers/v1/artists/{id}/supporters";
import { groupBy, keyBy } from "lodash";
import sendMail from "./send-mail";
import { Job } from "bullmq";

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
  totalIncome: number;
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

    const mappedArtists = keyBy(allArtists, "id");

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
              userSales,
              totalIncome,
              host: process.env.API_DOMAIN,
              client: process.env.REACT_APP_CLIENT_DOMAIN,
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
