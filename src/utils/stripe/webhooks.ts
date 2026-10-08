import prisma from "@mirlo/prisma";
import Stripe from "stripe";

import { AppError } from "../error";
import { getSiteSettings } from "../settings";

import { refreshStripeClient, stripe, STRIPE_API_VERSION } from ".";

export const STRIPE_CONNECT_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] =
  [
    "checkout.session.completed",
    "setup_intent.succeeded",
    "invoice.paid",
    "invoice.payment_failed",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "customer.subscription.deleted",
    "account.updated",
    "terminal.reader.action_succeeded",
    "terminal.reader.action_failed",
  ];

export const registerStripeConnectWebhook = async (baseUrl: string) => {
  const { id, settings } = await getSiteSettings();
  if (settings?.stripe?.webhookEndpointId) {
    throw new AppError({
      httpCode: 409,
      description: "A Stripe webhook is already registered",
    });
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: `${baseUrl}/v1/webhooks/stripe/connect`,
    connect: true,
    enabled_events: STRIPE_CONNECT_EVENTS,
    api_version: STRIPE_API_VERSION,
  });

  const stripeSettings = {
    ...settings?.stripe,
    webhookEndpointId: endpoint.id,
    webhookConnectSigningSecret: endpoint.secret,
  };
  await prisma.settings.update({
    where: { id },
    data: {
      settings: {
        ...settings,
        platformPercent: settings?.platformPercent ?? 7,
        stripe: stripeSettings,
      },
    },
  });
  await refreshStripeClient();
  return stripeSettings;
};
