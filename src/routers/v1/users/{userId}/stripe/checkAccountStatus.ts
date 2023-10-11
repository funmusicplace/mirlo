import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";

import stripe from "../../../../../utils/stripe";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    try {
      if (Number(userId) === Number(loggedInUser.id)) {
        const user = await prisma.user.findUnique({
          where: { id: Number(userId) },
        });
        if (user) {
          let accountId = user.stripeAccountId;

          if (!accountId) {
            res.status(200).json({
              result: {
                chargesEnabled: false,
                detailsSubmitted: false,
              },
            });
          } else {
            const account = await stripe.accounts.retrieve(accountId);
            res.status(200).json({
              result: {
                chargesEnabled: account.charges_enabled,
                detailsSubmitted: account.details_submitted,
              },
            });
          }
        }
      } else {
        res.status(200).json({
          result: {
            chargesEnabled: false,
          },
        });
      }
    } catch (e) {
      console.error(e);
      res.json({
        error: `Stripe Connect doesn't work yet`,
      });
    }
  }

  return operations;
}
