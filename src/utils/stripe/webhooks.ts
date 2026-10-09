import prisma from "@mirlo/prisma";
import Stripe from "stripe";
import type { Logger } from "winston";

import logger from "../../logger";
import { getSiteSettings } from "../settings";

import {
  handleTerminalReaderActionFailed,
  handleTerminalReaderActionSucceeded,
} from "./terminal";

import {
  handleAccountUpdate,
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

const connectWebhookUrl = (baseUrl: string) =>
  `${baseUrl}/v1/webhooks/stripe/connect`;

const updateConnectWebhook = (endpointId: string, baseUrl: string) =>
  stripe.webhookEndpoints.update(endpointId, {
    url: connectWebhookUrl(baseUrl),
    enabled_events: STRIPE_CONNECT_EVENTS,
  });

export const registerStripeConnectWebhook = async (baseUrl: string) => {
  const { id, settings } = await getSiteSettings();
  if (settings?.stripe?.webhookEndpointId) {
    try {
      await updateConnectWebhook(settings.stripe.webhookEndpointId, baseUrl);
      return settings.stripe;
    } catch (e) {
      if (
        !(e instanceof Stripe.errors.StripeError) ||
        e.code !== "resource_missing"
      ) {
        throw e;
      }
      logger.warn(
        `stripe-connect: webhook ${settings.stripe.webhookEndpointId} no longer exists, registering a new one`
      );
    }
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: connectWebhookUrl(baseUrl),
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

export const syncStripeConnectWebhookOnBoot = async () => {
  try {
    const { settings } = await getSiteSettings();
    const endpointId = settings?.stripe?.webhookEndpointId;
    if (endpointId) {
      await stripe.webhookEndpoints.update(endpointId, {
        enabled_events: STRIPE_CONNECT_EVENTS,
      });
    }
  } catch (e) {
    logger.warn(
      `stripe-connect: couldn't sync webhook on boot: ${(e as Error).message}`
    );
  }
};
