import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";

import stripe from "../../../../../utils/stripe";
const { API_DOMAIN } = process.env;

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
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
        res.status(401).json({
          error: "Invalid route",
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
