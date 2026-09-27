import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import { setUserTrustLevel } from "../../../src/utils/trustLevel";
import { clearTables, createUser } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("admin/users/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return 401 without auth", async () => {
      const { user } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .get(`admin/users/${user.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 401 for non-admin user", async () => {
      const { user, accessToken } = await createUser({
        email: "user@test.com",
      });

      const response = await requestApp
        .get(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return the user trust level", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { user } = await createUser({
        email: "user@test.com",
        trustLevel: 2,
      });

      const response = await requestApp
        .get(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.trustLevel, 2);
    });

    it("should return the trust level history", async () => {
      const { user: admin, accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { user } = await createUser({ email: "user@test.com" });
      await setUserTrustLevel(user.id, 2, "ADMIN", {
        changedByUserId: admin.id,
      });

      const response = await requestApp
        .get(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.trustLevelChanges.length, 1);
      const [change] = response.body.result.trustLevelChanges;
      assert.equal(change.fromLevel, 0);
      assert.equal(change.toLevel, 2);
      assert.equal(change.reason, "ADMIN");
      assert.equal(change.changedBy.email, "admin@test.com");
    });
  });

  describe("PUT", () => {
    it("should return 401 for non-admin user", async () => {
      const { user, accessToken } = await createUser({
        email: "user@test.com",
      });

      const response = await requestApp
        .put(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ trustLevel: 3 });

      assert.equal(response.statusCode, 401);
    });

    it("should update the user trust level and record the change", async () => {
      const { user: admin, accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { user } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .put(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ trustLevel: 3 });

      assert.equal(response.statusCode, 200);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
      });
      assert.equal(updated?.trustLevel, 3);

      const changes = await prisma.userTrustLevelChange.findMany({
        where: { userId: user.id },
      });
      assert.equal(changes.length, 1);
      assert.equal(changes[0].fromLevel, 0);
      assert.equal(changes[0].toLevel, 3);
      assert.equal(changes[0].reason, "ADMIN");
      assert.equal(changes[0].changedByUserId, admin.id);
    });

    it("should reset the spam strikes and report the count", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { user } = await createUser({
        email: "user@test.com",
        spamStrikes: 3,
      });

      const before = await requestApp
        .get(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(before.body.result.spamStrikes, 3);

      const response = await requestApp
        .put(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ resetSpamStrikes: true });
      assert.equal(response.statusCode, 200);

      const after = await requestApp
        .get(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(after.body.result.spamStrikes, 0);
    });

    it("should reject an unknown trust level", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { user } = await createUser({
        email: "user@test.com",
        trustLevel: 1,
      });

      const response = await requestApp
        .put(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ trustLevel: 7 });

      assert.equal(response.statusCode, 400);

      const unchanged = await prisma.user.findUnique({
        where: { id: user.id },
      });
      assert.equal(unchanged?.trustLevel, 1);
    });

    it("should leave the trust level untouched when omitted", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { user } = await createUser({
        email: "user@test.com",
        trustLevel: 2,
      });

      const response = await requestApp
        .put(`admin/users/${user.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ isLabelAccount: true });

      assert.equal(response.statusCode, 200);

      const unchanged = await prisma.user.findUnique({
        where: { id: user.id },
      });
      assert.equal(unchanged?.trustLevel, 2);
    });
  });
});

describe("admin/users", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should return 401 for non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .post("admin/users")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ users: [{ email: "new@test.com" }] });

      assert.equal(response.statusCode, 401);
    });

    it("should report how many accounts were created and skipped", async () => {
      const { accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await createUser({ email: "already@test.com" });

      const response = await requestApp
        .post("admin/users")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          users: [
            { email: "new@test.com" },
            { email: "already@test.com" },
            { email: "new@test.com" },
          ],
        });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.created, 1);
      assert.equal(response.body.skipped, 2);
      const created = await prisma.user.findMany({
        where: { email: { in: ["new@test.com", "already@test.com"] } },
      });
      assert.equal(created.length, 2);
    });
  });
});
