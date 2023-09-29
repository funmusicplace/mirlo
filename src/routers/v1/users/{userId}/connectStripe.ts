import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import stripe from "../../../../utils/stripe";
const { API_DOMAIN } = process.env;

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;
    if (Number(userId) === Number(loggedInUser.id)) {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });
      if (user) {
        let accountId = user.stripeAccountId;
        if (!accountId) {
          const account = await stripe.accounts.create({
            country: "US", // FIXME: we need to register users country
            type: "standard",
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
          refresh_url: "",
          return_url: "",
          type: "account_onboarding",
        });
        console.log("account", accountId, accountLink);

        res.status(200).json({
          accountUrl: accountLink.url,
        });
      }
    } else {
      res.status(401).json({
        error: "Invalid route",
      });
    }
  }

  return operations;
}
