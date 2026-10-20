import assert from "assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";
dotenv.config();

import { clearTables, createUser } from "../../utils";

import { API, createOAuthClient, tokensFor } from "./utils";

describe("connected apps", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const setup = async () => {
    const { user, accessToken } = await createUser({
      email: "fan@example.com",
      emailConfirmationToken: null,
    });
    const client = await createOAuthClient({ applicationName: "Radiccio" });
    const tokens = await tokensFor(
      accessToken,
      client,
      "openid api offline_access",
      { prompt: "consent" }
    );
    return { user, accessToken, client, tokens };
  };

  const profileWith = (token: string) =>
    request(API).get("/auth/profile").set("Authorization", `Bearer ${token}`);

  it("lists the user's apps for the cookie session only", async () => {
    const { user, accessToken, tokens } = await setup();

    const list = await request(API)
      .get(`/v1/users/${user.id}/connectedApps`)
      .set("Cookie", [`jwt=${accessToken}`]);
    assert.equal(list.status, 200, list.text);
    assert.equal(list.body.results.length, 1);
    assert.equal(list.body.results[0].name, "Radiccio");
    assert.deepEqual(list.body.results[0].scopes.sort(), [
      "api",
      "offline_access",
      "openid",
    ]);
    assert.ok(list.body.results[0].lastUsedAt);

    const viaToken = await request(API)
      .get(`/v1/users/${user.id}/connectedApps`)
      .set("Authorization", `Bearer ${tokens.access_token}`);
    assert.equal(viaToken.status, 403);

    const { accessToken: otherToken } = await createUser({
      email: "other@example.com",
    });
    const other = await request(API)
      .get(`/v1/users/${user.id}/connectedApps`)
      .set("Cookie", [`jwt=${otherToken}`]);
    assert.equal(other.status, 401);
  });

  it("disconnecting an app revokes its tokens", async () => {
    const { user, accessToken, client, tokens } = await setup();
    assert.equal((await profileWith(tokens.access_token)).status, 200);
    const grant = await prisma.oAuthPayload.findFirstOrThrow({
      where: { model: "Grant" },
    });

    const revoke = await request(API)
      .delete(`/v1/users/${user.id}/connectedApps/${grant.id}`)
      .set("Cookie", [`jwt=${accessToken}`]);
    assert.equal(revoke.status, 200, revoke.text);

    assert.equal((await profileWith(tokens.access_token)).status, 401);
    const refresh = await request(API)
      .post("/oidc/token")
      .auth(String(client.id), client.key!)
      .type("form")
      .send({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      });
    assert.equal(refresh.body.error, "invalid_grant");

    const again = await request(API)
      .delete(`/v1/users/${user.id}/connectedApps/${grant.id}`)
      .set("Cookie", [`jwt=${accessToken}`]);
    assert.equal(again.status, 404);
  });

  it("a password reset disconnects every app", async () => {
    const { user, tokens } = await setup();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetConfirmationToken: "reset-token",
        passwordResetConfirmationExpiration: new Date(Date.now() + 60_000),
      },
    });

    const reset = await request(API)
      .post("/auth/password-reset/set-password")
      .send({ id: user.id, token: "reset-token", password: "a-new-password" });
    assert.equal(reset.status, 200, reset.text);

    assert.equal((await profileWith(tokens.access_token)).status, 401);
    assert.equal(
      await prisma.oAuthPayload.count({ where: { accountId: user.id } }),
      0
    );
  });
});
