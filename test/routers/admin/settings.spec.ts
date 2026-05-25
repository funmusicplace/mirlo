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
