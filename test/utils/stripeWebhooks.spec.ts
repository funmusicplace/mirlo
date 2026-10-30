import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { Request } from "express";
import { afterEach, beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import sinon from "sinon";
import Stripe from "stripe";

import { AppError } from "../../src/utils/error";
import {
  refreshStripeClient,
  stripe,
  verifyStripeSignature,
} from "../../src/utils/stripe";
import {
  registerStripeConnectWebhook,
  STRIPE_CONNECT_EVENTS,
  syncStripeConnectWebhookOnBoot,
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
    const update = sinon.stub(stripe.webhookEndpoints, "update").resolves({
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

  it("registers a new endpoint when the saved one was deleted in Stripe", async () => {
    await createSiteSettings({
      platformPercent: 7,
      stripe: {
        webhookEndpointId: "we_deleted",
        webhookConnectSigningSecret: "whsec_old",
      },
    });
    sinon.stub(stripe.webhookEndpoints, "update").rejects(
      Stripe.errors.StripeError.generate({
        type: "invalid_request_error",
        code: "resource_missing",
        message: "No such webhook endpoint: 'we_deleted'",
      })
    );
    sinon.stub(stripe.webhookEndpoints, "create").resolves({
      id: "we_new",
      secret: "whsec_new",
    } as Stripe.Response<Stripe.WebhookEndpoint>);

    await registerStripeConnectWebhook("https://mirlo.example");

    const row = await prisma.settings.findFirst();
    assert.equal(row?.settings?.stripe?.webhookEndpointId, "we_new");
    assert.equal(
      row?.settings?.stripe?.webhookConnectSigningSecret,
      "whsec_new"
    );
  });

  describe("syncStripeConnectWebhookOnBoot", () => {
    it("updates the registered endpoint", async () => {
      await createSiteSettings({
        platformPercent: 7,
        stripe: { webhookEndpointId: "we_existing" },
      });
      const update = sinon.stub(stripe.webhookEndpoints, "update").resolves({
        id: "we_existing",
      } as Stripe.Response<Stripe.WebhookEndpoint>);

      await syncStripeConnectWebhookOnBoot();

      assert.equal(update.firstCall.args[0], "we_existing");
      assert.deepEqual(update.firstCall.args[1], {
        enabled_events: STRIPE_CONNECT_EVENTS,
      });
    });

    it("does nothing when no endpoint is registered", async () => {
      await createSiteSettings({ platformPercent: 7 });
      const update = sinon.stub(stripe.webhookEndpoints, "update");
      const create = sinon.stub(stripe.webhookEndpoints, "create");

      await syncStripeConnectWebhookOnBoot();

      assert.equal(update.callCount, 0);
      assert.equal(create.callCount, 0);
    });

    it("doesn't throw or recreate when the endpoint is gone", async () => {
      await createSiteSettings({
        platformPercent: 7,
        stripe: { webhookEndpointId: "we_deleted" },
      });
      sinon.stub(stripe.webhookEndpoints, "update").rejects(
        Stripe.errors.StripeError.generate({
          type: "invalid_request_error",
          code: "resource_missing",
          message: "No such webhook endpoint",
        })
      );
      const create = sinon.stub(stripe.webhookEndpoints, "create");

      await syncStripeConnectWebhookOnBoot();

      assert.equal(create.callCount, 0);
    });
  });

  describe("verifyStripeSignature", () => {
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({
      id: "evt_test",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_test" } },
    });
    const requestWith = (headers: Record<string, string>) =>
      ({
        headers,
        rawBody: payload,
        body: JSON.parse(payload),
      }) as unknown as Request;

    const rejectsWith = async (promise: Promise<unknown>, httpCode: number) => {
      await assert.rejects(
        promise,
        (e: unknown) => e instanceof AppError && e.httpCode === httpCode
      );
    };

    it("accepts a correctly signed event", async () => {
      const header = stripe.webhooks.generateTestHeaderString({
        payload,
        secret,
      });
      const event = await verifyStripeSignature(
        requestWith({ "stripe-signature": header }),
        secret
      );
      assert.equal(event.id, "evt_test");
    });

    it("rejects an event with no signature", async () => {
      await rejectsWith(verifyStripeSignature(requestWith({}), secret), 400);
    });

    it("rejects an event with a bad signature", async () => {
      const header = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: "whsec_someone_else",
      });
      await rejectsWith(
        verifyStripeSignature(
          requestWith({ "stripe-signature": header }),
          secret
        ),
        400
      );
    });

    it("rejects every event when no signing secret is configured", async () => {
      const header = stripe.webhooks.generateTestHeaderString({
        payload,
        secret,
      });
      await rejectsWith(
        verifyStripeSignature(requestWith({ "stripe-signature": header }), ""),
        500
      );
    });
  });
});
