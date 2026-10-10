import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { clearTables, createSiteSettings, createUser } from "../../../utils";
import { requestApp } from "../../utils";

describe("admin/setup/complete", () => {
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
        .post("admin/setup/complete")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 401 for non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .post("admin/setup/complete")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should refuse while the instance has no name", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({ platformPercent: 8 });

      const response = await requestApp
        .post("admin/setup/complete")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const row = await prisma.settings.findFirst();
      assert.equal(row?.setupCompletedAt, null);
    });

    it("should mark the setup as done and keep the settings", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createSiteSettings({
        platformPercent: 8,
        instanceCustomization: { title: "Nightjar" },
      });

      const response = await requestApp
        .post("admin/setup/complete")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.setupStage, "done");
      assert.equal(response.body.result.name, "Nightjar");

      const row = await prisma.settings.findFirst();
      assert.ok(row?.setupCompletedAt);
      assert.equal(row?.settings.platformPercent, 8);
    });

    it("should keep the first completion date on later calls", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { id } = await createSiteSettings({
        instanceCustomization: { title: "Nightjar" },
      });
      const completedAt = new Date("2026-01-01T00:00:00.000Z");
      await prisma.settings.update({
        where: { id },
        data: { setupCompletedAt: completedAt },
      });

      const response = await requestApp
        .post("admin/setup/complete")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.setupStage, "done");
      const row = await prisma.settings.findFirst();
      assert.equal(
        row?.setupCompletedAt?.toISOString(),
        completedAt.toISOString()
      );
    });
  });
});
