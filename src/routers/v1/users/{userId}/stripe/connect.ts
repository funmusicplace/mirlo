import { Request, Response, NextFunction } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import prisma from "@mirlo/prisma";
import { AppError, HttpCode } from "../../../../../utils/error";
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

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      if (Number(userId) === Number(loggedInUser.id)) {
        const user = await prisma.user.findUnique({
          where: { id: Number(userId) },
        });
        if (user) {
          let accountId = user.stripeAccountId;
          const alreadyExisted = !!accountId;

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
          } catch (e: any) {
            if (
              e?.code === "account_invalid" ||
              e?.type === "StripePermissionError"
            ) {
              return next(
                new AppError({
                  httpCode: HttpCode.FORBIDDEN,
                  description:
                    "Unable to access Stripe account. The API key may not have permission to access this account or the account may have been deleted.",
                })
              );
            }
            return next(
              new AppError({
                httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                description:
                  "Failed to retrieve Stripe account information. Please try again later.",
              })
            );
          }

          const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${API_DOMAIN}/v1/users/${userId}/stripe/connect`,
            return_url: `${API_DOMAIN}/v1/users/${userId}/stripe/connectComplete`,
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
