import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { AppError, HttpCode } from "../../../../../utils/error";
import stripe from "../../../../../utils/stripe";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    const loggedInUser = req.user;

    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });
      if (user) {
        let accountId = user.stripeAccountId;
        if (!accountId) {
          res.status(200).json({
            result: {
              chargesEnabled: false,
              ...(loggedInUser ? { detailsSubmitted: false } : {}),
            },
          });
        } else {
          let account;
          try {
            account = await stripe.accounts.retrieve(accountId);
          } catch (e: any) {
            if (
              e?.code === "account_invalid" ||
              e?.type === "StripePermissionError"
            ) {
              throw new AppError({
                httpCode: HttpCode.FORBIDDEN,
                description:
                  "Unable to access Stripe account. The API key may not have permission to access this account or the account may have been deleted.",
              });
            }
            throw new AppError({
              httpCode: HttpCode.INTERNAL_SERVER_ERROR,
              description:
                "Failed to retrieve Stripe account information. Please try again later.",
            });
          }
          res.status(200).json({
            result: {
              chargesEnabled: account?.charges_enabled ?? false,
              stripeAccountId: accountId,
              defaultCurrency: account?.default_currency?.toUpperCase(),
              ...(loggedInUser
                ? { detailsSubmitted: account?.details_submitted ?? false }
                : {}),
            },
          });
        }
      }
      res.status(404);
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
