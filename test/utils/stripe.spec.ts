import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, beforeEach, describe, it } from "mocha";

import prisma from "@mirlo/prisma";
import { refreshStripeClient } from "../../src/utils/stripe";
import { clearTables } from "../utils";

describe("utils/stripe.refreshStripeClient", () => {
  const originalEnvKey = process.env.STRIPE_KEY;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    process.env.STRIPE_KEY = originalEnvKey;
  });

  it("uses the key stored on the admin Settings row when present (#1147)", async () => {
    await prisma.settings.create({
      data: { settings: { stripe: { key: "sk_test_from_db" } } },
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
      data: { settings: { stripe: { key: "   " } } },
    });

    const apiKey = await refreshStripeClient();

    assert.equal(apiKey, "sk_test_from_env");
  });
});
