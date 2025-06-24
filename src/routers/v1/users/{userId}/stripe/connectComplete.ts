import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";

import stripe from "../../../../../utils/stripe";
import logger from "../../../../../logger";
import { getClient } from "../../../../../activityPub/utils";
import { AppError } from "../../../../../utils/error";
import { updateCurrencies } from "../../../../../utils/user";
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
            throw new AppError({
              httpCode: 400,
              description: "No Stripe account found",
            });
          }
          const client = await getClient();

          logger.info(
            `Connecting ${user.id} to Stripe. Have existing account:  ${accountId}`
          );

          try {
            const stripeAccount = await stripe.accounts.retrieve(accountId);
            if (stripeAccount.default_currency) {
              updateCurrencies(user.id, stripeAccount.default_currency);
            }
          } catch (e) {
            console.error(`Error retrieving account information about user`, e);
          }

          res.redirect(`${client?.applicationUrl}/manage?stripeConnect=done`);
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
