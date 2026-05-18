import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { clearTables, createUser } from "../../utils";
import { requestApp } from "../utils";

const seedCode = async (userId: number, code: string, offsetMs = 0) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      userConfirmationCode: code,
      userConfirmationCodeExpiration: new Date(Date.now() + offsetMs),
    },
  });
};

describe("users/{userId}/stripe/resetCode", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("stores a 6-digit code on the user (#2085 PR feedback)", async () => {
    const { user, accessToken } = await createUser({
      email: "send-code@artist.com",
      emailConfirmationToken: null,
    });

    const response = await requestApp
      .post(`users/${user.id}/stripe/resetCode`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
    });
    assert.ok(
      refreshed?.userConfirmationCode &&
        /^\d{6}$/.test(refreshed.userConfirmationCode),
      `expected a 6-digit code on the user, got: ${refreshed?.userConfirmationCode}`
    );
    assert.ok(
      refreshed?.userConfirmationCodeExpiration &&
        refreshed.userConfirmationCodeExpiration > new Date(),
      "expected a future expiration on the user"
    );
  });

  it("rejects sending a code for another user's account", async () => {
    const { accessToken } = await createUser({
      email: "intruder-code@artist.com",
      emailConfirmationToken: null,
    });
    const { user: victim } = await createUser({
      email: "victim-code@artist.com",
      emailConfirmationToken: null,
    });

    const response = await requestApp
      .post(`users/${victim.id}/stripe/resetCode`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
    const refreshed = await prisma.user.findUnique({
      where: { id: victim.id },
    });
    assert.equal(refreshed?.userConfirmationCode, null);
  });
});

describe("users/{userId}/stripe/reset", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("clears stripeAccountId with correct password + verification code (#2085 PR feedback)", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "reset@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_orphaned" },
    });
    await seedCode(user.id, "424242", 15 * 60 * 1000);

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, code: "424242" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.stripeAccountId, null);

    const refreshed = await prisma.user.findFirst({
      where: { id: user.id },
    });
    assert.equal(refreshed?.stripeAccountId, null);
    // Code consumed on success so it can't be reused
    assert.equal(refreshed?.userConfirmationCode, null);
    assert.equal(refreshed?.userConfirmationCodeExpiration, null);
  });

  it("accepts a code with spaces (matches the EmailVerification UI's display format)", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "spaced-code@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_orphaned" },
    });
    await seedCode(user.id, "424242", 15 * 60 * 1000);

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, code: "42 42 42" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
  });

  it("rejects a wrong code", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "wrong-code@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_orphaned" },
    });
    await seedCode(user.id, "111111", 15 * 60 * 1000);

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, code: "999999" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
    const refreshed = await prisma.user.findFirst({
      where: { id: user.id },
    });
    assert.equal(refreshed?.stripeAccountId, "acct_orphaned");
    // Stored code preserved so the user can retry with the right one
    assert.equal(refreshed?.userConfirmationCode, "111111");
  });

  it("rejects an expired code", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "expired-code@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_orphaned" },
    });
    await seedCode(user.id, "424242", -60 * 1000); // expired one minute ago

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, code: "424242" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
    const refreshed = await prisma.user.findFirst({
      where: { id: user.id },
    });
    assert.equal(refreshed?.stripeAccountId, "acct_orphaned");
  });

  it("rejects when no code has been requested", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "no-code@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_orphaned" },
    });

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, code: "424242" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
  });

  it("rejects when the code is missing from the body", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "missing-code@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await seedCode(user.id, "424242", 15 * 60 * 1000);

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("rejects a wrong password", async () => {
    const { user, accessToken } = await createUser({
      email: "wrongpw@artist.com",
      password: "correct-pw",
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_orphaned" },
    });
    await seedCode(user.id, "424242", 15 * 60 * 1000);

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password: "wrong-pw", code: "424242" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);

    const refreshed = await prisma.user.findFirst({
      where: { id: user.id },
    });
    assert.equal(refreshed?.stripeAccountId, "acct_orphaned");
  });

  it("rejects resetting another user's stripe account", async () => {
    const password = "test1234";
    const { accessToken } = await createUser({
      email: "intruder@artist.com",
      password,
      emailConfirmationToken: null,
    });
    const { user: victim } = await createUser({
      email: "victim@artist.com",
      password: "victim-pw",
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: victim.id },
      data: { stripeAccountId: "acct_victim" },
    });
    await seedCode(victim.id, "424242", 15 * 60 * 1000);

    const response = await requestApp
      .post(`users/${victim.id}/stripe/reset`)
      .send({ password, code: "424242" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);

    const refreshedVictim = await prisma.user.findFirst({
      where: { id: victim.id },
    });
    assert.equal(refreshedVictim?.stripeAccountId, "acct_victim");
  });

  it("is a no-op when no stripeAccountId is set (but still consumes the code)", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "no-stripe@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await seedCode(user.id, "424242", 15 * 60 * 1000);

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, code: "424242" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.stripeAccountId, null);

    const refreshed = await prisma.user.findFirst({
      where: { id: user.id },
    });
    assert.equal(refreshed?.userConfirmationCode, null);
  });
});
