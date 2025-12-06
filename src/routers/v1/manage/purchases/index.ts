import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";

import prisma from "@mirlo/prisma";
import { AppError } from "../../../../utils/error";
import { processSingleMerch } from "../../../../utils/merch";
import { User } from "@mirlo/prisma/client";
import { downloadCSVFile } from "../../../../utils/download";

type Params = {
  merchId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const user = req.user as User;

    try {
      const total = await prisma.merchPurchase.count({
        where: {
          merch: { artist: { userId: user.id } },
        },
      });
      const purchases = await prisma.merchPurchase.findMany({
        where: {
          merch: { artist: { userId: user.id } },
        },
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
