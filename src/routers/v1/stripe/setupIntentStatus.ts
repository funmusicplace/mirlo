import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import stripe from "../../../utils/stripe";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { setupIntent, stripeAccountId } = req.query;
    try {
      if (
        typeof setupIntent !== "string" ||
        typeof stripeAccountId !== "string"
      ) {
        throw new AppError({
          httpCode: 404,
          description: "SetupIntent not found",
        });
      }
      const intent = await stripe.setupIntents.retrieve(setupIntent, {
        stripeAccount: stripeAccountId,
      });

      return res.status(200).json({
        result: {
          status: intent.status,
          paymentIntentAmount: intent.metadata?.paymentIntentAmount,
          trackGroupId: intent.metadata?.trackGroupId,
        },
      });
    } catch (e) {
      console.error(e);
      next(e);
    }
  }

  return operations;
}
