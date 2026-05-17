import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { clearTables, createUser } from "../../utils";
import { requestApp } from "../utils";

describe("users/{userId}/stripe/reset", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("clears stripeAccountId with correct password + email (#2085)", async () => {
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

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, email: "reset@artist.com" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.stripeAccountId, null);

    const refreshed = await prisma.user.findFirst({
      where: { id: user.id },
    });
    assert.equal(refreshed?.stripeAccountId, null);
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

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password: "wrong-pw", email: "wrongpw@artist.com" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);

    const refreshed = await prisma.user.findFirst({
      where: { id: user.id },
    });
    assert.equal(refreshed?.stripeAccountId, "acct_orphaned");
  });

  it("rejects a mismatched email", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "mismatch@artist.com",
      password,
      emailConfirmationToken: null,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_orphaned" },
    });

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, email: "someone-else@artist.com" })
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

    const response = await requestApp
      .post(`users/${victim.id}/stripe/reset`)
      .send({ password, email: "victim@artist.com" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);

    const refreshedVictim = await prisma.user.findFirst({
      where: { id: victim.id },
    });
    assert.equal(refreshedVictim?.stripeAccountId, "acct_victim");
  });

  it("is a no-op when no stripeAccountId is set", async () => {
    const password = "test1234";
    const { user, accessToken } = await createUser({
      email: "no-stripe@artist.com",
      password,
      emailConfirmationToken: null,
    });

    const response = await requestApp
      .post(`users/${user.id}/stripe/reset`)
      .send({ password, email: "no-stripe@artist.com" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.stripeAccountId, null);
  });
});
