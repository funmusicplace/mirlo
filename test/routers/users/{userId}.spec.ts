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
    it("should set pending email if password is correct", async () => {
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

      assert.equal(response.statusCode, 200);
      // Email should still be the old email before confirmation
      assert.equal(response.body.result.email, "user@test.com");
      // But pendingEmail should be set to the new email
      assert.equal(response.body.result.pendingEmail, newEmail);

      const refreshedUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      // Original email should remain until confirmed
      assert.equal(refreshedUser?.email, "user@test.com");
      // New email should be in pending
      assert.equal(refreshedUser?.pendingEmail, newEmail);
      // Token should be generated
      assert(refreshedUser?.pendingEmailToken);
      // Expiration should be set (24 hours from now)
      assert(refreshedUser?.pendingEmailExpiration);
    });
  });

  describe("POST confirmEmailChange", () => {
    it("should confirm email change with valid token", async () => {
      const { user, accessToken } = await createUser({
        email: "user@test.com",
        password: "test1234",
        emailConfirmationToken: null,
      });

      const newEmail = faker.internet.email();

      // First, request email change
      const changeResponse = await requestApp
        .put(`users/${user.id}`)
        .send({
          newEmail: newEmail,
          password: "test1234",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(changeResponse.statusCode, 200);

      // Get the pending email token from database
      const userWithPending = await prisma.user.findFirst({
        where: { id: user.id },
      });

      assert(userWithPending?.pendingEmailToken);
      const token = userWithPending.pendingEmailToken;

      // Now confirm the email change
      const confirmResponse = await requestApp
        .post(`users/${user.id}/confirmEmailChange`)
        .send({
          token: token,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(confirmResponse.statusCode, 200);
      assert.equal(confirmResponse.body.result.email, newEmail);

      // Verify in database
      const finalUser = await prisma.user.findFirst({
        where: { id: user.id },
      });
      assert.equal(finalUser?.email, newEmail);
      assert.equal(finalUser?.pendingEmail, null);
      assert.equal(finalUser?.pendingEmailToken, null);
    });

    it("should reject email change with invalid token", async () => {
      const { user, accessToken } = await createUser({
        email: "user@test.com",
        password: "test1234",
        emailConfirmationToken: null,
      });

      const newEmail = faker.internet.email();

      // Request email change
      await requestApp
        .put(`users/${user.id}`)
        .send({
          newEmail: newEmail,
          password: "test1234",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      // Try to confirm with wrong token
      const confirmResponse = await requestApp
        .post(`users/${user.id}/confirmEmailChange`)
        .send({
          token: "wrong-token",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(confirmResponse.statusCode, 400);
      assert.equal(confirmResponse.body.error, "Invalid token");

      // Email should not change
      const finalUser = await prisma.user.findFirst({
        where: { id: user.id },
      });
      assert.equal(finalUser?.email, "user@test.com");
      assert.equal(finalUser?.pendingEmail, newEmail);
    });

    it("should reject email change with expired token", async () => {
      const { user, accessToken } = await createUser({
        email: "user@test.com",
        password: "test1234",
        emailConfirmationToken: null,
      });

      const newEmail = faker.internet.email();
      const expiredToken = faker.datatype.uuid();

      // Manually set expired token in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingEmail: newEmail,
          pendingEmailToken: expiredToken,
          pendingEmailExpiration: new Date(Date.now() - 1000), // 1 second in the past
        },
      });

      // Try to confirm with expired token
      const confirmResponse = await requestApp
        .post(`users/${user.id}/confirmEmailChange`)
        .send({
          token: expiredToken,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(confirmResponse.statusCode, 400);
      assert.equal(confirmResponse.body.error, "Token expired");

      // Email should not change
      const finalUser = await prisma.user.findFirst({
        where: { id: user.id },
      });
      assert.equal(finalUser?.email, "user@test.com");
      assert.equal(finalUser?.pendingEmail, newEmail);
    });

    it("should reject confirmation when no pending email change exists", async () => {
      const { user, accessToken } = await createUser({
        email: "user@test.com",
        emailConfirmationToken: null,
      });

      const confirmResponse = await requestApp
        .post(`users/${user.id}/confirmEmailChange`)
        .send({
          token: faker.datatype.uuid(),
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(confirmResponse.statusCode, 400);
      assert.equal(confirmResponse.body.error, "No pending email change");
    });
  });
});
