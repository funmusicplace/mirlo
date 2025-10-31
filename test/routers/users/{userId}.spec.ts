import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";

import { describe, it } from "mocha";
import { clearTables, createUser } from "../../utils";

import { requestApp } from "../utils";
import { faker } from "@faker-js/faker";
import { hashPassword } from "../../../src/routers/auth/utils";

describe("users/{userId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should update user information", async () => {
      const { user, accessToken } = await createUser({
        email: "user@testcom",
      });

      const newName = faker.company.name();
      const response = await requestApp
        .put(`users/${user.id}`)
        .send({
          name: newName,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const refreshedUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      assert.equal(refreshedUser?.name, newName);
    });
    it("should not update user email if password not sent", async () => {
      const { user, accessToken } = await createUser({
        email: "user@testcom",
        emailConfirmationToken: null,
      });

      const newEmail = faker.internet.email();
      const response = await requestApp
        .put(`users/${user.id}`)
        .send({
          newEmail: newEmail,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.error, "Can't change user email, not found");
      assert.equal(response.statusCode, 401);
      const refreshedUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      assert.notEqual(refreshedUser?.email, newEmail);
    });
    it("should not update user email if password is wrong", async () => {
      const { user, accessToken } = await createUser({
        email: "user@testcom",
        password: await hashPassword("test1234"),
        emailConfirmationToken: null,
      });

      const newEmail = faker.internet.email();
      const response = await requestApp
        .put(`users/${user.id}`)
        .send({
          newEmail: newEmail,
          password: "test",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(
        response.body.error,
        "Can't change user email, wrong password"
      );
      assert.equal(response.statusCode, 401);
      const refreshedUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      assert.notEqual(refreshedUser?.email, newEmail);
    });
    it("should  update user email if password is correct", async () => {
      const { user, accessToken } = await createUser({
        email: "user@test.com",
        password: "test1234",
        emailConfirmationToken: null,
      });

      const newEmail = faker.internet.email();
      const response = await requestApp
        .put(`users/${user.id}`)
        .send({
          newEmail: newEmail,
          password: "test1234",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.result.email, newEmail);
      assert.equal(response.statusCode, 200);
      const refreshedUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      assert.equal(refreshedUser?.email, newEmail);
    });
  });
});
