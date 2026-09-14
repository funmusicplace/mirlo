import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

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

    it("should update the user trust level", async () => {
      const { accessToken } = await createUser({
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
