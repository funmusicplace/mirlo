import prisma from "@mirlo/prisma";
import Stripe from "stripe";
import type { Logger } from "winston";

import { AppError } from "../error";
import { getSiteSettings } from "../settings";

import {
  handleTerminalReaderActionFailed,
  handleTerminalReaderActionSucceeded,
} from "./terminal";

import {
  handleAccountUpdate,
  handleCheckoutSession,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handlePaymentIntentFailed,
  handlePaymentIntentSucceeded,
  handleSetupIntentSucceeded,
  handleSubscriptionDeleted,
  refreshStripeClient,
  stripe,
  STRIPE_API_VERSION,
} from ".";

type ConnectEventHandlers = {
  [T in Stripe.Event["type"]]?: (
    event: Extract<Stripe.Event, { type: T }>,
    log: Logger
  ) => Promise<unknown> | unknown;
};

export const stripeConnectEventHandlers = {
  "checkout.session.completed": async (event, log) => {
    // To trigger this event type use
    // `stripe trigger checkout.session.completed --add checkout_session:metadata.userId=3 --add checkout_session:metadata.tierId=2`
    const session = event.data.object;
    log.info(`stripe-connect: checkout status is ${session.status}.`);
    await handleCheckoutSession(session);
  },
  "setup_intent.succeeded": async (event, log) => {
    // To trigger this event type use
    // `stripe trigger setup_intent.succeeded --add setup_intent:metadata.userId=3`
    const setupIntent = event.data.object;
    log.info(`stripe-connect: setup intent status is ${setupIntent.status}.`);
    await handleSetupIntentSucceeded(setupIntent);
  },
  "invoice.paid": (event) =>
    handleInvoicePaid(event.data.object, event.account as string),
  "invoice.payment_failed": (event) =>
    handleInvoicePaymentFailed(event.data.object, event.account as string),
  "payment_intent.succeeded": (event) =>
    handlePaymentIntentSucceeded(event.data.object, event.account as string),
  "payment_intent.payment_failed": (event) =>
    handlePaymentIntentFailed(event.data.object, event.account as string),
  // Fires when a subscription actually ends — at the close of a paid
  // period we scheduled for cancellation, or after Stripe's dunning
  // retries are exhausted. This is when access is revoked.
  "customer.subscription.deleted": (event) =>
    handleSubscriptionDeleted(event.data.object),
  "account.updated": (event) => handleAccountUpdate(event.data.object),
  // To test: stripe trigger terminal.reader.action_succeeded
  "terminal.reader.action_succeeded": (event) =>
    handleTerminalReaderActionSucceeded(event.data.object, event.account ?? ""),
  "terminal.reader.action_failed": (event) =>
    handleTerminalReaderActionFailed(event.data.object),
} satisfies ConnectEventHandlers;

export const STRIPE_CONNECT_EVENTS = Object.keys(
  stripeConnectEventHandlers
) as (keyof typeof stripeConnectEventHandlers &
  Stripe.WebhookEndpointCreateParams.EnabledEvent)[];

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
