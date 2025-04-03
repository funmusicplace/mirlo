import { NextFunction, Request, Response } from "express";
import {
  merchPurchaseBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

type Params = {
  purchaseId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, merchPurchaseBelongsToLoggedInUser, PUT],
    GET: [userAuthenticated, merchPurchaseBelongsToLoggedInUser, GET],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { purchaseId } = req.params as unknown as Params;
    const { fulfillmentStatus, trackingNumber, trackingWebsite } = req.body;
    try {
      const updatedCount = await prisma.merchPurchase.updateMany({
        where: {
          id: purchaseId,
        },
        data: {
          fulfillmentStatus,
          trackingNumber,
          trackingWebsite,
        },
      });

      if (updatedCount) {
        const artist = await prisma.merchPurchase.findFirst({
          where: { id: purchaseId },
        });
        res.json({ result: artist });
      } else {
        res.json({
          error: "An unknown error occurred",
        });
      }
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a merch purchase belonging to a user",
    parameters: [
      {
        in: "path",
        name: "purchaseId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "purchase",
        schema: {
          $ref: "#/definitions/MerchPurchase",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated merch purchase",
        schema: {
          $ref: "#/definitions/MerchPurchase",
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { purchaseId } = req.params as unknown as Params;

    try {
      const purchase = await prisma.merchPurchase.findFirst({
        where: {
          id: purchaseId,
        },
        include: {
          merch: { include: { images: true, artist: true } },
          user: true,
        },
      });

      if (!purchase) {
        return res.status(404).json({
          error: "Purchase not found",
        });
      } else {
        return res.json({
          result: purchase,
        });
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns merch purchase information that belongs to a user",
    parameters: [
      {
        in: "path",
        name: "purchaseId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "An merchPurchase that matches the id",
        schema: {
          $ref: "#/definitions/MerchPurchase",
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
