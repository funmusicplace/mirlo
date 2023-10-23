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
          const client = await prisma.client.findFirst({});

          if (!accountId) {
            const account = await stripe.accounts.create({
              type: "express",
              business_profile: { name: user.name ?? "" },
            });
            await prisma.user.update({
              where: {
                id: user.id,
              },
              data: {
                stripeAccountId: account.id,
              },
            });
            accountId = account.id;
          }

          const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${API_DOMAIN}/v1/users/${userId}/stripe/connect`,
            return_url: `${client?.applicationUrl}/manage?stripeConnect=done`,
            type: "account_onboarding",
          });

          res.redirect(accountLink.url);
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
