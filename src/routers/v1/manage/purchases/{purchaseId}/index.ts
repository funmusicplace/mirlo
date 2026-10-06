import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  merchPurchaseBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import logger from "../../../../../logger";
import { serializeMerchPurchase } from "../../../../../serializers/merchPurchase";
import { buyerUserSelect } from "../../../../../utils/artist";
import { AppError } from "../../../../../utils/error";
import { merchImagesInclude } from "../../../../../utils/merch";
import {
  hasShipmentChanged,
  sendShipmentUpdateEmail,
} from "../../../../../utils/shipmentUpdateEmail";

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
      const existing = await prisma.merchPurchase.findFirst({
        where: { id: purchaseId },
        select: {
          fulfillmentStatus: true,
          trackingNumber: true,
          trackingWebsite: true,
        },
      });

      if (!existing) {
        throw new AppError({
          httpCode: 404,
          description: "Merch purchase not found",
        });
      }

      const updated = await prisma.merchPurchase.update({
        where: {
          id: purchaseId,
        },
        data: {
          fulfillmentStatus,
          trackingNumber,
          trackingWebsite,
        },
        include: {
          merch: {
            select: {
              title: true,
              profile: { select: { name: true, urlSlug: true } },
            },
          },
          user: { select: buyerUserSelect },
        },
      });

      if (hasShipmentChanged(existing, updated)) {
        try {
          await sendShipmentUpdateEmail(updated);
        } catch (e) {
          // Don't fail the artist's update just because the email couldn't
          // be queued.
          logger.error("Failed to queue shipment update email", e);
        }
      }

      res.json({ result: updated });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary:
      "Updates the fulfillment status and tracking info of a merch purchase",
    description:
      "Only fulfillmentStatus, trackingNumber and trackingWebsite are updated. " +
      "If the fulfillment status changes, or tracking info is newly added or " +
      "changed, the buyer is emailed about the shipment update.",
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
          type: "object",
          properties: {
            fulfillmentStatus: {
              type: "string",
              enum: ["NO_PROGRESS", "STARTED", "SHIPPED", "COMPLETED"],
            },
            trackingNumber: { type: ["string", "null"] },
            trackingWebsite: { type: ["string", "null"] },
          },
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
          merch: {
            include: {
              images: merchImagesInclude,
              profile: { omit: { apPrivateKey: true } },
            },
          },
          user: { select: buyerUserSelect },
        },
      });

      if (!purchase) {
        return res.status(404).json({
          error: "Purchase not found",
        });
      } else {
        return res.json({
          result: serializeMerchPurchase(purchase),
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
