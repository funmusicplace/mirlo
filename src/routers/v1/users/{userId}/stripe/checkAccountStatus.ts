import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import prisma from "@mirlo/prisma";

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
    assertLoggedIn(req);
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
          } catch (e) {
            console.error(`Error retreiving Stripe information about user`, e);
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
