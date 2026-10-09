import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import { clearTables, createSiteSettings, createUser } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("admin/settings", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  // Reset server-side _bucketConfig after any test that may have changed it
  // via POST /admin/settings. clearTables() wipes the DB but the in-memory
  // _bucketConfig on the API server persists and would affect later test files.
  afterEach(async () => {
    try {
      const { accessToken } = await createUser({
        email: "settings-reset@test.com",
        isAdmin: true,
      });
      await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ bucketNames: null, settings: { platformPercent: 7 } });
    } catch (e) {
      // best-effort reset; don't fail the test suite if this errors
    }
  });

  describe("GET", () => {
    it("should return 401 without auth", async () => {
      const response = await requestApp
        .get("admin/settings")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 401 for non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .get("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return keyConfigured: false when no stripe key is set", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({ platformPercent: 7 });

      const response = await requestApp
        .get("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.settings.stripe?.keyConfigured, false);
      assert.equal(response.body.result.settings.stripe?.key, undefined);
    });

    it("should return keyConfigured: true and no raw key when a stripe key is set", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 7,
        stripe: { key: "sk_test_secret" },
      });

      const response = await requestApp
        .get("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.settings.stripe.keyConfigured, true);
      assert.equal(response.body.result.settings.stripe.key, undefined);
      assert.equal(response.body.result.stripe, undefined);
    });

    it("should mask the webhook signing secret", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 7,
        stripe: { webhookConnectSigningSecret: "whsec_secret" },
      });

      const response = await requestApp
        .get("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const { stripe } = response.body.result.settings;
      assert.equal(stripe.webhookSecretConfigured, true);
      assert.equal(stripe.webhookConnectSigningSecret, undefined);
      assert.ok(!JSON.stringify(response.body).includes("whsec_secret"));
    });
  });

  describe("POST", () => {
    it("should return 401 without auth", async () => {
      const response = await requestApp
        .post("admin/settings")
        .send({ settings: { platformPercent: 7 } })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should save a new stripe key", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 7,
            stripe: { key: "sk_test_new_key" },
          },
        });

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      const stripe = (row?.settings as Record<string, unknown>)
        ?.stripe as Record<string, unknown>;
      assert.equal(stripe?.key, "sk_test_new_key");
    });

    it("should not expose the raw key in the POST response", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 7,
            stripe: { key: "sk_test_secret" },
          },
        });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.settings.stripe.key, undefined);
      assert.equal(response.body.result.settings.stripe.keyConfigured, true);
    });

    it("should preserve the existing stripe key when blank key is submitted", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 7,
        stripe: { key: "sk_test_existing" },
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 10,
            stripe: { key: "" },
          },
        });

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      const stripe = (row?.settings as Record<string, unknown>)
        ?.stripe as Record<string, unknown>;
      assert.equal(stripe?.key, "sk_test_existing");
    });

    it("should preserve the existing stripe key when a whitespace-only key is submitted", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 7,
        stripe: { key: "sk_test_existing" },
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 10,
            stripe: { key: "   " },
          },
        });

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      const stripe = (row?.settings as Record<string, unknown>)
        ?.stripe as Record<string, unknown>;
      assert.equal(stripe?.key, "sk_test_existing");
    });

    it("should preserve the existing webhook secret when a blank one is submitted", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 7,
        stripe: { webhookConnectSigningSecret: "whsec_existing" },
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 10,
            stripe: { webhookConnectSigningSecret: "" },
          },
        });

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      const stripe = (row?.settings as Record<string, unknown>)
        ?.stripe as Record<string, unknown>;
      assert.equal(stripe?.webhookConnectSigningSecret, "whsec_existing");
    });

    it("should keep the stored settings keys the request does not send", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 7,
        instanceCustomization: { title: "Nightjar Records" },
        someFutureKey: { nested: true },
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 10,
            instanceCustomization: { title: "Nightjar" },
          },
        });

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      const stored = row?.settings as Record<string, unknown>;
      assert.equal(stored.platformPercent, 10);
      assert.deepEqual(stored.instanceCustomization, { title: "Nightjar" });
      assert.deepEqual(stored.someFutureKey, { nested: true });
    });

    it("should keep the stripe keys, featured artists and defcon level a partial request does not send", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { id } = await createSiteSettings({
        platformPercent: 7,
        stripe: {
          key: "sk_test_secret",
          publishableKey: "pk_test_public",
          webhookEndpointId: "we_123",
        },
        featuredArtistIds: [3, 5],
      });
      await prisma.settings.update({ where: { id }, data: { defconLevel: 2 } });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ settings: { platformPercent: 10, stripe: { key: "" } } });

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      const stored = row?.settings as Record<string, any>;
      assert.equal(stored.platformPercent, 10);
      assert.deepEqual(stored.stripe, {
        key: "sk_test_secret",
        publishableKey: "pk_test_public",
        webhookEndpointId: "we_123",
      });
      assert.deepEqual(stored.featuredArtistIds, [3, 5]);
      assert.equal(row?.defconLevel, 2);
    });

    it("should trim the instance name before storing it", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({ platformPercent: 7 });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 7,
            instanceCustomization: { title: "  Nightjar  ", artistId: "4" },
          },
        });

      assert.equal(response.statusCode, 200);
      assert.equal(
        response.body.result.settings.instanceCustomization.title,
        "Nightjar"
      );

      const row = await prisma.settings.findFirst();
      const stored = row?.settings as Record<string, any>;
      assert.deepEqual(stored.instanceCustomization, {
        title: "Nightjar",
        artistId: "4",
      });
    });

    it("should save bucketNames: { prefix: 'foo-' } to DB and return it in response", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          bucketNames: { prefix: "foo-" },
          settings: { platformPercent: 7 },
        });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.bucketNames.prefix, "foo-");

      const row = await prisma.settings.findFirst();
      assert.deepEqual(row?.bucketNames, { prefix: "foo-" });
    });

    it("should save bucketNames: null (legacy mode) to DB", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ bucketNames: null, settings: { platformPercent: 7 } });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.bucketNames, null);

      const row = await prisma.settings.findFirst();
      assert.equal(row?.bucketNames, null);
    });

    it("should save trust level names", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 7,
            trustLevelNames: ["Newcomer", "Member", "Regular", "Veteran"],
          },
        });

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      assert.deepEqual(row?.settings.trustLevelNames, [
        "Newcomer",
        "Member",
        "Regular",
        "Veteran",
      ]);
    });

    it("should reject malformed trust level names", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 7,
        trustLevelNames: ["Newcomer"],
      });

      const response = await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          settings: {
            platformPercent: 7,
            trustLevelNames: { 0: "Newcomer" },
          },
        });

      assert.equal(response.statusCode, 400);

      const row = await prisma.settings.findFirst();
      assert.deepEqual(row?.settings.trustLevelNames, ["Newcomer"]);
    });

    it("should not update bucketNames when omitted from request", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          bucketNames: { prefix: "keep-" },
          settings: { platformPercent: 7 },
        });

      await requestApp
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ settings: { platformPercent: 7 } });

      const row = await prisma.settings.findFirst();
      assert.deepEqual(row?.bucketNames, { prefix: "keep-" });
    });
  });
});
