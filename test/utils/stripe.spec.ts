import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  getStripeWebhookConnectSigningSecret,
  refreshStripeClient,
} from "../../src/utils/stripe";
import { clearTables } from "../utils";

describe("utils/stripe.refreshStripeClient", () => {
  const originalEnvKey = process.env.STRIPE_KEY;
  const originalEnvWebhookSecret =
    process.env.STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    process.env.STRIPE_KEY = originalEnvKey;
    process.env.STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET =
      originalEnvWebhookSecret;
  });

  it("uses the key stored on the admin Settings row when present (#1147)", async () => {
    await prisma.settings.create({
      data: {
        settings: { platformPercent: 7, stripe: { key: "sk_test_from_db" } },
      },
    });

    const apiKey = await refreshStripeClient();

    assert.equal(apiKey, "sk_test_from_db");
  });

  it("falls back to STRIPE_KEY env when no key is saved in settings", async () => {
    process.env.STRIPE_KEY = "sk_test_from_env";
    await prisma.settings.create({
      data: { settings: { platformPercent: 7 } },
    });

    const apiKey = await refreshStripeClient();

    assert.equal(apiKey, "sk_test_from_env");
  });

  it("prefers the env key when the saved settings key is blank", async () => {
    process.env.STRIPE_KEY = "sk_test_from_env";
    await prisma.settings.create({
      data: {
        settings: { platformPercent: 7, stripe: { key: "   " } },
      },
    });

    const apiKey = await refreshStripeClient();

    assert.equal(apiKey, "sk_test_from_env");
  });

  it("uses the webhook connect signing secret stored on the admin Settings row when present", async () => {
    await prisma.settings.create({
      data: {
        settings: {
          platformPercent: 7,
          stripe: { webhookConnectSigningSecret: "whsec_from_db" },
        },
      },
    });

    await refreshStripeClient();

    assert.equal(getStripeWebhookConnectSigningSecret(), "whsec_from_db");
  });

  it("falls back to STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET env when no secret is saved in settings", async () => {
    process.env.STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET = "whsec_from_env";
    await prisma.settings.create({
      data: { settings: { platformPercent: 7 } },
    });

    await refreshStripeClient();

    assert.equal(getStripeWebhookConnectSigningSecret(), "whsec_from_env");
  });
});
