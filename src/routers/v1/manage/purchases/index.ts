import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import { assertLoggedIn } from "../../../../auth/getLoggedInUser";

import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { downloadCSVFile } from "../../../../utils/download";
import { getDateRange } from "../../../../utils/dateRange";

type Params = {
  merchId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const user = req.user;
    let {
      take = 50,
      skip = 0,
      artistIds = undefined,
      datePurchased = undefined,
    } = req.query as {
      take: number | string;
      skip: number | string;
      artistIds?: string | string[] | number[] | undefined;
      datePurchased?: string;
    };

    try {
      if (!artistIds) {
        artistIds = (
          await prisma.artist.findMany({
            where: {
              userId: user.id,
            },
          })
        ).map((a) => a.id);
      } else if (typeof artistIds === "string") {
        // If artistIds is a string, split it into an array
        artistIds = artistIds.split(",");
      }

      let sinceDate: string | undefined;
      let untilDate: string | undefined;

      const dateRange = getDateRange(datePurchased);
      if (dateRange) {
        sinceDate = dateRange.gte;
        untilDate = dateRange.lt;
      }

      const whereClause: any = {
        merch: { artist: { id: { in: artistIds.map((a) => Number(a)) } } },
      };

      if (sinceDate && untilDate) {
        whereClause.createdAt = {
          gte: new Date(sinceDate),
          lt: new Date(untilDate),
        };
      }

      const total = await prisma.merchPurchase.count({
        where: whereClause,
      });

      const purchases = await prisma.merchPurchase.findMany({
        where: whereClause,
        include: {
          merch: {
            include: {
              artist: true,
            },
          },
          options: {
            include: {
              merchOptionType: true,
            },
          },
          transaction: true,
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: Number(take),
        skip: Number(skip),
      });

      if (req.query?.format === "csv") {
        return downloadCSVFile(res, "fulfillment.csv", csvColumns, purchases);
      } else {
        return res.status(200).json({
          results: purchases,
          total,
        });
      }
    } catch (e) {
      next(e);
    }
  }

  return operations;
}

const csvColumns = [
  {
    label: "Artist",
    value: "merch.artist.name",
  },
  {
    label: "Item",
    value: "merch.title",
  },
  {
    label: "Purchase date",
    value: "createdAt",
  },
  {
    label: "User",
    value: "user.name",
  },
  {
    label: "Quantity",
    value: "quantity",
  },
  {
    label: "Shipping address name",
    value: "shippingAddress.name",
  },
  {
    label: "Shipping address line 1",
    value: "shippingAddress.line1",
  },
  {
    label: "Shipping address line 1",
    value: "shippingAddress.line2",
  },
  {
    label: "Shipping address city",
    value: "shippingAddress.city",
  },
  {
    label: "Shipping address country",
    value: "shippingAddress.country",
  },
  {
    label: "Billing address",
    value: "billingAddress",
  },
  {
    label: "Fulfillment status",
    value: "fulfillmentStatus",
  },
  {
    label: "Purchase date",
    value: "createdAt",
  },
  {
    label: "Tracking number",
    value: "trackingNumber",
  },
  {
    label: "Tracking website",
    value: "trackingWebsite",
  },
  { label: "Options", value: "options" },
  { label: "Amount paid", value: "transaction.amount" },
  { label: "Platform fee", value: "transaction.platformCut" },
  { label: "Payment processor fee", value: "transaction.stripeCut" },
  { label: "Shipping fee amount", value: "transaction.shippingFeeAmount" },
];
