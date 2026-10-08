import assert from "node:assert";

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

  it("updates the registered endpoint instead of creating another", async () => {
    await createSiteSettings({
      platformPercent: 7,
      stripe: {
        webhookEndpointId: "we_existing",
        webhookConnectSigningSecret: "whsec_existing",
      },
    });
    const create = sinon.stub(stripe.webhookEndpoints, "create");
    const update = sinon
      .stub(stripe.webhookEndpoints, "update")
      .resolves({
        id: "we_existing",
      } as Stripe.Response<Stripe.WebhookEndpoint>);

    await registerStripeConnectWebhook("https://mirlo.example");

    assert.equal(create.callCount, 0);
    assert.equal(update.firstCall.args[0], "we_existing");
    assert.deepEqual(update.firstCall.args[1], {
      url: "https://mirlo.example/v1/webhooks/stripe/connect",
      enabled_events: STRIPE_CONNECT_EVENTS,
    });
    const row = await prisma.settings.findFirst();
    assert.equal(
      row?.settings?.stripe?.webhookConnectSigningSecret,
      "whsec_existing"
    );
  });
});
