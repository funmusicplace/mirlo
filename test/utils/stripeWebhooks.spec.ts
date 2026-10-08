import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import sinon from "sinon";
import Stripe from "stripe";

import { refreshStripeClient, stripe } from "../../src/utils/stripe";
import {
  registerStripeConnectWebhook,
  STRIPE_CONNECT_EVENTS,
} from "../../src/utils/stripe/webhooks";
import { clearTables, createSiteSettings } from "../utils";

describe("utils/stripe/webhooks", () => {
  beforeEach(async () => {
    await clearTables();
  });

  afterEach(async () => {
    sinon.restore();
    await clearTables();
    await refreshStripeClient();
  });

  it("subscribes to exactly the events the Connect handler switches on", () => {
    const handler = readFileSync(
      join(__dirname, "../../src/routers/v1/webhooks/stripe/connect.ts"),
      "utf8"
    );
    // Array.from, not spread: ts-node here doesn't downlevel iterators.
    const handled = Array.from(
      handler.matchAll(/case "([a-z_.]+)":/g),
      (m) => m[1]
    );
    assert.ok(handled.length > 0, "found no case labels in the handler");
    assert.deepEqual(handled.sort(), [...STRIPE_CONNECT_EVENTS].sort());
  });

  it("creates a Connect endpoint and saves its id and secret", async () => {
    await createSiteSettings({
      platformPercent: 7,
      stripe: { key: "sk_test_x" },
    });
    const create = sinon.stub(stripe.webhookEndpoints, "create").resolves({
      id: "we_new",
      secret: "whsec_new",
    } as Stripe.Response<Stripe.WebhookEndpoint>);

    await registerStripeConnectWebhook("https://mirlo.example");

    const params = create.firstCall.args[0];
    assert.equal(
      params?.url,
      "https://mirlo.example/v1/webhooks/stripe/connect"
    );
    assert.equal(params?.connect, true);
    assert.equal(params?.api_version, "2023-08-16");
    assert.deepEqual(params?.enabled_events, STRIPE_CONNECT_EVENTS);
    const row = await prisma.settings.findFirst();
    assert.deepEqual(row?.settings?.stripe, {
      key: "sk_test_x",
      webhookEndpointId: "we_new",
      webhookConnectSigningSecret: "whsec_new",
    });
  });

  it("refuses to register a second endpoint", async () => {
    await createSiteSettings({
      platformPercent: 7,
      stripe: { webhookEndpointId: "we_existing" },
    });
    const create = sinon.stub(stripe.webhookEndpoints, "create");

    await assert.rejects(
      registerStripeConnectWebhook("https://mirlo.example"),
      { httpCode: 409 }
    );
    assert.equal(create.callCount, 0);
  });
});
