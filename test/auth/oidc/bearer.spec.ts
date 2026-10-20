import assert from "assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";
dotenv.config();

import { clearTables, createUser } from "../../utils";

import { API, createOAuthClient, tokensFor } from "./utils";

describe("oauth bearer tokens", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const setup = async (
    scope = "openid account",
    isAdmin = false,
    extra: Record<string, string> = {}
  ) => {
    const { user, accessToken } = await createUser({
      email: "fan@example.com",
      emailConfirmationToken: null,
      isAdmin,
    });
    const client = await createOAuthClient();
    const tokens = await tokensFor(accessToken, client, scope, extra);
    return { user, client, tokens };
  };

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  it("acts as the user with the account scope", async () => {
    const { user, tokens } = await setup();
    const response = await request(API)
      .get("/auth/profile")
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 200);
    assert.equal(response.body.result.id, user.id);
  });

  it("refuses a token without the account scope on account routes", async () => {
    const { user, tokens } = await setup("openid profile");
    const response = await request(API)
      .get(`/v1/users/${user.id}/purchases`)
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 403);
    assert.match(
      response.headers["www-authenticate"],
      /error="insufficient_scope", scope="account"/
    );
  });

  it("refuses an unknown token", async () => {
    const response = await request(API)
      .get("/auth/profile")
      .set(bearer("not-a-token"));
    assert.equal(response.status, 401);
    assert.match(response.headers["www-authenticate"], /invalid_token/);
  });

  it("ignores other Authorization schemes", async () => {
    const response = await request(API)
      .get("/v1/artists")
      .set("Authorization", "Basic Zm9vOmJhcg==");
    assert.equal(response.status, 200);
  });

  it("never makes the token an admin, and keeps account deletion and payouts cookie-only", async () => {
    const { user, tokens } = await setup("openid account", true);
    const headers = bearer(tokens.access_token);

    const admin = await request(API).get("/v1/admin/clients").set(headers);
    assert.equal(admin.status, 401);

    const remove = await request(API)
      .delete(`/v1/users/${user.id}`)
      .set(headers);
    assert.equal(remove.status, 403);
    assert.ok(await prisma.user.findFirst({ where: { id: user.id } }));

    const connect = await request(API)
      .get(`/v1/users/${user.id}/stripe/connect`)
      .set(headers);
    assert.equal(connect.status, 403);
  });

  it("stands in for the API key on cross-origin writes", async () => {
    const { user, tokens } = await setup();

    const withoutAnything = await request(API)
      .put(`/v1/users/${user.id}`)
      .send({ name: "New name" });
    assert.equal(withoutAnything.status, 401);

    const response = await request(API)
      .put(`/v1/users/${user.id}`)
      .set(bearer(tokens.access_token))
      .send({ name: "New name" });
    assert.equal(response.status, 200, response.text);
    const updated = await prisma.user.findFirstOrThrow({
      where: { id: user.id },
    });
    assert.equal(updated.name, "New name");
  });

  it("stops working when the app is revoked or the user is disabled", async () => {
    const { user, client, tokens } = await setup();
    const call = () =>
      request(API).get("/auth/profile").set(bearer(tokens.access_token));

    await prisma.client.update({
      where: { id: client.id },
      data: { status: "revoked" },
    });
    assert.equal((await call()).status, 401);

    await prisma.client.update({
      where: { id: client.id },
      data: { status: "approved" },
    });
    assert.equal((await call()).status, 200);

    await prisma.user.update({
      where: { id: user.id },
      data: { disabledAt: new Date() },
    });
    assert.equal((await call()).status, 401);
  });

  it("issues refresh tokens only for offline_access with prompt=consent", async () => {
    const withoutPrompt = await setup("openid account offline_access");
    assert.equal(withoutPrompt.tokens.refresh_token, undefined);

    await clearTables();
    const { client, tokens } = await setup(
      "openid account offline_access",
      false,
      { prompt: "consent" }
    );
    assert.ok(tokens.refresh_token);

    const refreshed = await request(API)
      .post("/oidc/token")
      .auth(String(client.id), client.key!)
      .type("form")
      .send({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      });
    assert.equal(refreshed.status, 200, refreshed.text);
    assert.ok(refreshed.body.access_token);

    const profile = await request(API)
      .get("/auth/profile")
      .set(bearer(refreshed.body.access_token));
    assert.equal(profile.status, 200);
  });

  it("can't be used to approve another app", async () => {
    const { tokens } = await setup();
    const other = await createOAuthClient({ applicationName: "Other" });
    const agent = request.agent(API);
    const start = await agent.get(
      `/oidc/auth?${new URLSearchParams({
        client_id: String(other.id),
        response_type: "code",
        redirect_uri: "https://app.example/callback",
        scope: "openid account",
        code_challenge: "x".repeat(43),
        code_challenge_method: "S256",
        state: "s",
      })}`
    );
    const uid = start.headers.location.match(/\/oauth\/([^/?#]+)$/)?.[1];

    const decision = await agent
      .post(`/oauth/${uid}/decision`)
      .set(bearer(tokens.access_token))
      .send({ action: "allow" });
    assert.equal(decision.status, 401);
  });
});
