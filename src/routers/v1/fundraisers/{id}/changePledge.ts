import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  siteUserAuthenticated,
  userOrAppAuthenticated,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getCurrency, minimumPledge } from "../../../../utils/stripe/currency";

const closedFundraiserError = () =>
  new AppError({
    httpCode: 400,
    description: "This fundraiser is no longer accepting pledges",
  });

export default function () {
  const operations = {
    PUT: [siteUserAuthenticated, PUT],
    DELETE: [userOrAppAuthenticated, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      assertLoggedIn(req);
      const loggedInUser = req.user;
      const pledge = await prisma.fundraiserPledge.findFirst({
        where: {
          userId: loggedInUser.id,
          fundraiserId: Number(id),
          paidAt: null,
        },
        include: { fundraiser: true },
      });
      if (pledge) {
        if (pledge.fundraiser.status !== "ACTIVE") {
          throw closedFundraiserError();
        }
        const cancelled = await prisma.fundraiserPledge.updateMany({
          where: {
            id: pledge.id,
            paidAt: null,
            fundraiser: { status: "ACTIVE" },
          },
          data: {
            cancelledAt: new Date(),
          },
        });
        if (cancelled.count === 0) {
          throw closedFundraiserError();
        }
      }
      res.status(200);
      res.json({ result: { success: true } });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Cancels the logged in user's pledge to a fundraiser",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: { description: "The pledge was cancelled, or there was none" },
      400: { description: "The fundraiser is no longer accepting pledges" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { amount } = req.body;
    try {
      assertLoggedIn(req);
      const loggedInUser = req.user;
      if (!Number.isInteger(amount)) {
        throw new AppError({
          httpCode: 400,
          description: "The pledge amount must be a whole number of cents",
        });
      }
      const pledge = await prisma.fundraiserPledge.findFirst({
        where: {
          userId: loggedInUser.id,
          fundraiserId: Number(id),
          cancelledAt: null,
          paidAt: null,
        },
        include: { fundraiser: true },
      });
      if (!pledge) {
        throw new AppError({
          httpCode: 404,
          description: "Pledge not found",
        });
      }
      if (pledge.fundraiser.status !== "ACTIVE") {
        throw closedFundraiserError();
      }
      const currency =
        pledge.currency ??
        (await getCurrency(
          pledge.fundraiser.profileId,
          pledge.stripeAccountId ?? undefined
        ));
      if (amount < minimumPledge(pledge.fundraiser.minPledge, currency)) {
        throw new AppError({
          httpCode: 400,
          description: "Pledge amount is below the minimum required.",
        });
      }
      await prisma.fundraiserPledge.update({
        where: {
          id: pledge.id,
        },
        data: {
          amount,
        },
      });
      res.status(200);
      res.json({ result: { success: true } });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary:
      "Changes the amount of the logged in user's pledge to a fundraiser",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "pledge",
        required: true,
        schema: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: { type: "integer", description: "In cents" },
          },
        },
      },
    ],
    responses: {
      200: { description: "The pledge was changed" },
      400: {
        description:
          "The amount is invalid or below the minimum, or the fundraiser is closed",
      },
      404: { description: "No open pledge found" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
