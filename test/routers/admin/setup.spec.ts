import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import { clearTables, createSiteSettings, createUser } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("admin/setup", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should return 401 without auth", async () => {
      const response = await requestApp
        .post("admin/setup")
        .send({ name: "Nightjar" })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 401 for non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .post("admin/setup")
        .send({ name: "Nightjar" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 400 when the name is blank", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/setup")
        .send({ name: "   " })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should save the name, contact email and button colours", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/setup")
        .send({
          name: " Nightjar ",
          supportEmail: " hello@nightjar.test ",
          colors: { button: "#eda100", buttonText: "#000000" },
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "Nightjar");
      assert.equal(response.body.result.setupStage, "guide");
      assert.deepEqual(response.body.result.colors, {
        button: "#eda100",
        buttonText: "#000000",
        background: "#ffffff",
        text: "#000000",
      });

      const row = await prisma.settings.findFirst();
      assert.deepEqual(row?.settings.instanceCustomization, {
        showHeroOnHome: true,
        title: "Nightjar",
        supportEmail: "hello@nightjar.test",
        colors: { button: "#eda100", buttonText: "#000000" },
      });
    });

    it("should leave every other setting untouched", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 8,
        stripe: { key: "sk_test_kept" },
        instanceCustomization: {
          artistId: "7",
          supportEmail: "kept@nightjar.test",
          colors: { background: "#101010", button: "#111111" },
        },
      });

      const response = await requestApp
        .post("admin/setup")
        .send({ name: "Nightjar", colors: { button: "#5c899c" } })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const row = await prisma.settings.findFirst();
      assert.equal(row?.settings.platformPercent, 8);
      assert.equal(row?.settings.stripe?.key, "sk_test_kept");
      assert.deepEqual(row?.settings.instanceCustomization, {
        artistId: "7",
        supportEmail: "kept@nightjar.test",
        title: "Nightjar",
        colors: { background: "#101010", button: "#5c899c" },
      });
    });
  });
});
