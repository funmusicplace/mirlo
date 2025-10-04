import prisma from "@mirlo/prisma";

import logger from "../logger";
import { findSales } from "../routers/v1/artists/{id}/supporters";
import { groupBy, keyBy } from "lodash";
import sendMail from "./send-mail";
import { Job } from "bullmq";

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
        user: { select: { id: true, name: true, email: true } },
        userId: true,
      },
    });
    const sales = await findSales({
      artistId: allArtists.map((artist) => artist.id),
      sinceDate: startOfLastMonth.toISOString(),
      untilDate: endOfLastMonth.toISOString(),
      orderBy: { datePurchased: "asc" },
    });

    const artistOwners = new Map<number, number>();
    const usersById = new Map<
      number,
      {
        id: number;
        name: string | null;
        email: string | null;
      }
    >();

    for (const artist of allArtists) {
      if (typeof artist.id === "number" && typeof artist.userId === "number") {
        artistOwners.set(artist.id, artist.userId);
      }

      if (typeof artist.userId === "number" && artist.user) {
        usersById.set(artist.userId, artist.user);
      }
    }

    const groupedSales = groupBy(sales, (sale) => {
      const userIdFromSale = sale.artist?.userId;
      if (typeof userIdFromSale === "number") {
        return String(userIdFromSale);
      }

      const artistId = sale.artist?.id ?? (sale as { artistId?: number }).artistId;
      if (typeof artistId === "number") {
        const ownerId = artistOwners.get(artistId);
        if (typeof ownerId === "number") {
          return String(ownerId);
        }
      }

      return "unknown";
    });

    for (const [userIdKey, userSales] of Object.entries(groupedSales)) {
      if (!userSales.length) {
        continue;
      }

      const userId = Number(userIdKey);

      if (!Number.isFinite(userId)) {
        logger.warn(
          `Skipping monthly income report for unresolved owner identifier ${userIdKey}`
        );
        continue;
      }

      const user = usersById.get(userId);

      if (!user?.email) {
        logger.warn(
          `Skipping monthly income report for artist owner ${userId} because no email address was found.`
        );
        continue;
      }

      const normalizedSales = userSales.map((sale) => ({
        ...sale,
        amount: Number(sale.amount ?? 0),
      }));
      const totalIncome = normalizedSales.reduce(
        (sum, sale) => sum + sale.amount,
        0
      );

      if (totalIncome <= 0) {
        logger.info(
          `Skipping monthly income report for artist owner ${userId} because no income was recorded.`
        );
        continue;
      }

      try {
        await sendMail({
          data: {
            template: "announce-monthly-income-report",
            message: {
              to: user.email,
            },
            locals: {
              user,
              userSales: normalizedSales,
              totalIncome,
              host: process.env.API_DOMAIN,
              client: process.env.REACT_APP_CLIENT_DOMAIN,
            },
          },
        } as Job);
      } catch (error) {
        logger.error(
          `Error sending out monthly income report to artist owner ${userId} (${user.email})`,
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
