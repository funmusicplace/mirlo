import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";

import stripe from "../../../../../utils/stripe";
import logger from "../../../../../logger";
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
          const alreadyExisted = !!accountId;
          const client = await prisma.client.findFirst({});
          logger.info(
            `Connecting ${user.id} to Stripe. Have existing account: ${alreadyExisted} ${accountId}`
          );

          if (!accountId) {
            const account = await stripe.accounts.create({
              type: "standard",
              email: user.email,
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
            logger.info(`Created new stripe account ${account.id}`);
          }

          let stripeAccount;
          try {
            stripeAccount = await stripe.accounts.retrieve(accountId);
          } catch (e) {
            console.error(e);
          }

          const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${API_DOMAIN}/v1/users/${userId}/stripe/connect`,
            return_url: `${client?.applicationUrl}/manage?stripeConnect=done`,
            type: "account_onboarding", // FIXME: is it ever possible to pass "account_update" here?
          });

          logger.info(`Generated Stripe account link`);

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
        error: `Stripe Connect encountered a problem`,
      });
    }
  }

  return operations;
}
