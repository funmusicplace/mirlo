import prisma from "@mirlo/prisma";
import { compact, uniq } from "lodash";
import Stripe from "stripe";

import type { DataMigration } from "..";
import logger from "../../logger";
import { resolvePayee } from "../../utils/payments/payee";
import stripe from "../../utils/stripe";

const isNotOnAccount = (e: unknown) =>
  e instanceof Stripe.errors.StripeInvalidRequestError ||
  e instanceof Stripe.errors.StripePermissionError;

const subscriptionStripeAccounts: DataMigration = {
  name: "2026-11-subscription-stripe-accounts",
  run: async () => {
    const subscriptions = await prisma.profileUserSubscription.findMany({
      where: { stripeSubscriptionKey: { not: null }, stripeAccountId: null },
      select: {
        id: true,
        stripeSubscriptionKey: true,
        profileSubscriptionTier: {
          select: {
            profile: {
              select: {
                user: { select: { stripeAccountId: true } },
                paymentToUser: { select: { stripeAccountId: true } },
                artistLabels: {
                  select: { labelUser: { select: { stripeAccountId: true } } },
                },
              },
            },
          },
        },
      },
    });

    let found = 0;
    for (const subscription of subscriptions) {
      const { profile } = subscription.profileSubscriptionTier;
      const candidates = uniq(
        compact([
          resolvePayee({ profile }).stripeAccountId,
          profile.user.stripeAccountId,
          ...profile.artistLabels.map((al) => al.labelUser.stripeAccountId),
        ])
      );
      for (const stripeAccountId of candidates) {
        try {
          await stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionKey!,
            { stripeAccount: stripeAccountId }
          );
        } catch (e) {
          if (isNotOnAccount(e)) {
            continue;
          }
          logger.error(
            `dataMigrations: couldn't look up subscription ${subscription.id}, will retry`,
            e
          );
          return false;
        }
        await prisma.profileUserSubscription.update({
          where: { id: subscription.id },
          data: { stripeAccountId },
        });
        found += 1;
        break;
      }
    }
    logger.info(
      `dataMigrations: recorded the Stripe account of ${found} of ${subscriptions.length} subscriptions`
    );
    return true;
  },
};

export default subscriptionStripeAccounts;
