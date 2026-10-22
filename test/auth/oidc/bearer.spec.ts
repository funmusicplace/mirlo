import assert from "assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";
dotenv.config();

import {
  clearTables,
  createProfile,
  createArtistLabel,
  createUser,
} from "../../utils";

import { API, createOAuthClient, tokenRequest, tokensFor } from "./utils";

describe("oauth bearer tokens", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const setup = async (
    scope = "openid api",
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

  it("acts as the user with the api scope", async () => {
    const { user, tokens } = await setup();
    const response = await request(API)
      .get("/auth/profile")
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 200);
    assert.equal(response.body.result.id, user.id);
  });

  it("refuses a token without the api scope on routes that act as the user", async () => {
    const { user, tokens } = await setup("openid profile");
    const response = await request(API)
      .get(`/v1/users/${user.id}/purchases`)
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 403);
    assert.match(
      response.headers["www-authenticate"],
      /error="insufficient_scope", scope="api"/
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
    const { user, tokens } = await setup("openid api", true);
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

  it("keeps managers, labels, payouts and artist deletion cookie-only", async () => {
    const { user, tokens } = await setup();
    const headers = bearer(tokens.access_token);
    const { user: label } = await createUser({
      email: "label@example.com",
      isLabelAccount: true,
    });
    const profile = await createProfile(user.id);
    await createArtistLabel({
      artistId: profile.id,
      labelUserId: label.id,
      isArtistApproved: false,
    });

    const approveLabel = await request(API)
      .put(`/v1/manage/artists/${profile.id}/labels/${label.id}`)
      .set(headers)
      .send({ isArtistApproved: true });
    assert.equal(approveLabel.status, 403);

    const addLabel = await request(API)
      .post(`/v1/manage/artists/${profile.id}/labels`)
      .set(headers)
      .send({ labelUserId: label.id });
    assert.equal(addLabel.status, 403);

    const addManager = await request(API)
      .post(`/v1/manage/artists/${profile.id}/managers`)
      .set(headers)
      .send({ email: "label@example.com" });
    assert.equal(addManager.status, 403);

    const payouts = await request(API)
      .put(`/v1/manage/artists/${profile.id}`)
      .set(headers)
      .send({ paymentToUserId: label.id });
    assert.equal(payouts.status, 403);

    const rename = await request(API)
      .put(`/v1/manage/artists/${profile.id}`)
      .set(headers)
      .send({ name: "Renamed" });
    assert.equal(rename.status, 200, rename.text);

    const remove = await request(API)
      .delete(`/v1/manage/artists/${profile.id}`)
      .set(headers);
    assert.equal(remove.status, 403);

    const unchanged = await prisma.profile.findFirstOrThrow({
      where: { id: profile.id },
      include: { artistLabels: true },
    });
    assert.equal(unchanged.paymentToUserId, null);
    assert.equal(unchanged.artistLabels[0].isArtistApproved, false);
  });

  it("stands in for the API key on cross-origin writes", async () => {
    const { user, tokens } = await setup();
    await prisma.notification.create({
      data: { userId: user.id, notificationType: "USER_FOLLOWED_YOU" },
    });

    const withoutAnything = await request(API).put(
      `/v1/users/${user.id}/notifications/markAllRead`
    );
    assert.equal(withoutAnything.status, 401);

    const response = await request(API)
      .put(`/v1/users/${user.id}/notifications/markAllRead`)
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 200, response.text);
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: user.id },
    });
    assert.equal(notification.isRead, true);
  });

  it("refuses writes that aren't open to apps", async () => {
    const { user, tokens } = await setup();
    const response = await request(API)
      .put(`/v1/users/${user.id}`)
      .set(bearer(tokens.access_token))
      .send({ name: "New name" });
    assert.equal(response.status, 403);
    const unchanged = await prisma.user.findFirstOrThrow({
      where: { id: user.id },
    });
    assert.notEqual(unchanged.name, "New name");

    const pledge = await request(API)
      .put("/v1/fundraisers/1/changePledge")
      .set(bearer(tokens.access_token))
      .send({ amount: 100000 });
    assert.equal(pledge.status, 403);
  });

  it("refuses an expired token on a write with the RFC 6750 header", async () => {
    const { user } = await setup();
    const response = await request(API)
      .put(`/v1/users/${user.id}/notifications/markAllRead`)
      .set(bearer("not-a-token"));
    assert.equal(response.status, 401);
    assert.match(response.headers["www-authenticate"], /invalid_token/);
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

  it("stops working once its grant is gone", async () => {
    const { tokens } = await setup();
    await prisma.oAuthPayload.deleteMany({ where: { model: "Grant" } });
    const response = await request(API)
      .get("/auth/profile")
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 401);
  });

  it("stays revoked when an admin revokes the app and then approves it again", async () => {
    const { client, tokens } = await setup();
    const { accessToken: adminToken } = await createUser({
      email: "admin@example.com",
      isAdmin: true,
    });
    const revoked = await request(API)
      .put(`/v1/admin/clients/${client.id}`)
      .set("Cookie", [`jwt=${adminToken}`])
      .send({ status: "revoked" });
    assert.equal(revoked.status, 200, revoked.text);
    const approved = await request(API)
      .put(`/v1/admin/clients/${client.id}`)
      .set("Cookie", [`jwt=${adminToken}`])
      .send({ status: "approved" });
    assert.equal(approved.status, 200, approved.text);

    const response = await request(API)
      .get("/auth/profile")
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 401);
  });

  it("drops the app's tokens when an admin deletes it", async () => {
    const { client } = await setup();
    const { accessToken: adminToken } = await createUser({
      email: "admin@example.com",
      isAdmin: true,
    });
    const deleted = await request(API)
      .delete(`/v1/admin/clients/${client.id}`)
      .set("Cookie", [`jwt=${adminToken}`]);
    assert.equal(deleted.status, 200, deleted.text);
    assert.equal(
      await prisma.oAuthPayload.count({ where: { grantId: { not: null } } }),
      0
    );
    assert.equal(
      await prisma.oAuthPayload.count({ where: { model: "Grant" } }),
      0
    );
  });

  it("stays revoked when an admin disables the user and then enables them again", async () => {
    const { user, tokens } = await setup();
    const { accessToken: adminToken } = await createUser({
      email: "admin@example.com",
      isAdmin: true,
    });
    for (const disabled of [true, false]) {
      const response = await request(API)
        .put(`/v1/admin/users/${user.id}`)
        .set("Cookie", [`jwt=${adminToken}`])
        .send({ disabled });
      assert.equal(response.status, 200, response.text);
    }

    const response = await request(API)
      .get("/auth/profile")
      .set(bearer(tokens.access_token));
    assert.equal(response.status, 401);
  });

  it("issues refresh tokens only for offline_access with prompt=consent", async () => {
    const withoutPrompt = await setup("openid api offline_access");
    assert.equal(withoutPrompt.tokens.refresh_token, undefined);

    await clearTables();
    const { client, tokens } = await setup("openid api offline_access", false, {
      prompt: "consent",
    });
    assert.ok(tokens.refresh_token);

    const refreshed = await request(API)
      .post("/auth/oidc/token")
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

  it("rotates a public client's refresh token and revokes the grant when an old one is reused", async () => {
    const { accessToken } = await createUser({
      email: "fan@example.com",
      emailConfirmationToken: null,
    });
    const client = await createOAuthClient({ confidential: false });
    const tokens = await tokensFor(
      accessToken,
      client,
      "openid api offline_access",
      { prompt: "consent" }
    );
    const refresh = (refreshToken: string) =>
      tokenRequest(client, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

    const rotated = await refresh(tokens.refresh_token!);
    assert.equal(rotated.status, 200, rotated.text);
    assert.notEqual(rotated.body.refresh_token, tokens.refresh_token);

    const reused = await refresh(tokens.refresh_token!);
    assert.equal(reused.body.error, "invalid_grant");

    const afterReuse = await refresh(rotated.body.refresh_token);
    assert.equal(afterReuse.body.error, "invalid_grant");
    const profile = await request(API)
      .get("/auth/profile")
      .set(bearer(rotated.body.access_token));
    assert.equal(profile.status, 401);
  });

  it("stops a revoked refresh token and access token", async () => {
    const { client, tokens } = await setup("openid api offline_access", false, {
      prompt: "consent",
    });
    for (const token of [tokens.refresh_token!, tokens.access_token]) {
      const revoked = await tokenRequest(
        client,
        { token },
        "/auth/oidc/token/revocation"
      );
      assert.equal(revoked.status, 200, revoked.text);
    }

    const refreshed = await tokenRequest(client, {
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token!,
    });
    assert.equal(refreshed.body.error, "invalid_grant");
    const profile = await request(API)
      .get("/auth/profile")
      .set(bearer(tokens.access_token));
    assert.equal(profile.status, 401);
  });

  it("can't be used to approve another app", async () => {
    const { tokens } = await setup();
    const other = await createOAuthClient({ applicationName: "Other" });
    const agent = request.agent(API);
    const start = await agent.get(
      `/auth/oidc/auth?${new URLSearchParams({
        client_id: String(other.id),
        response_type: "code",
        redirect_uri: "https://app.example/callback",
        scope: "openid api",
        code_challenge: "x".repeat(43),
        code_challenge_method: "S256",
        state: "s",
      })}`
    );
    const uid = start.headers.location.match(/\/oauth\/([^/?#]+)$/)?.[1];

    const decision = await agent
      .post(`/auth/oauth/${uid}/decision`)
      .set(bearer(tokens.access_token))
      .send({ action: "allow" });
    assert.equal(decision.status, 401);
  });
});
