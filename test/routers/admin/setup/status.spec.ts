import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { clearTables, createSiteSettings, createUser } from "../../../utils";
import { requestApp } from "../../utils";

describe("admin/setup/status", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return 401 without auth", async () => {
      const response = await requestApp
        .get("admin/setup/status")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 401 for non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .get("admin/setup/status")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should report every check with a status and no secret", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const response = await requestApp
        .get("admin/setup/status")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const { checks, steps } = response.body.result;
      assert.deepEqual(Object.keys(checks).sort(), [
        "database",
        "publicAddress",
        "redis",
        "scheduledTasks",
        "storage",
        "worker",
      ]);
      for (const check of Object.values<{ status: string }>(checks)) {
        assert.ok(["ok", "warning", "error"].includes(check.status));
      }
      assert.equal(checks.database.status, "ok");
      assert.ok(checks.database.migrations > 0);
      assert.equal(checks.redis.status, "ok");
      assert.equal(steps.identity, false);
      assert.equal(steps.platformPolicy, false);
      const body = JSON.stringify(response.body);
      assert.ok(!body.includes(process.env.JWT_SECRET ?? "unset"));
      assert.ok(!body.includes("postgresql://"));
    });

    it("should report the steps already done from the settings", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const row = await createSiteSettings({
        instanceCustomization: { title: "Nightjar" },
        emailProvider: { provider: "smtp", smtp: { host: "mail.test" } },
      });
      await prisma.settings.update({
        where: { id: row.id },
        data: { contentPolicy: "No spam." },
      });

      const response = await requestApp
        .get("admin/setup/status")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(response.body.result.steps, {
        identity: true,
        email: true,
        platformPolicy: true,
      });
    });
  });
});
