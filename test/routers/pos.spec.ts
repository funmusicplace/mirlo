import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import { createOAuthClient, tokensFor } from "../auth/oidc/utils";
import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../utils";

import { requestApp } from "./utils";

describe("pos scope", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const setup = async (scope = "pos") => {
    const { user, accessToken } = await createUser({
      email: "artist@test.com",
      emailConfirmationToken: null,
      stripeAccountId: "acct_pos_scope",
    });
    const profile = await createProfile(user.id);
    const client = await createOAuthClient({ applicationName: "POS plugin" });
    const tokens = await tokensFor(accessToken, client, scope);
    return { profile, token: tokens.access_token as string };
  };

  it("lists readers", async () => {
    const { profile, token } = await setup();

    const response = await requestApp
      .get(`manage/artists/${profile.id}/readers`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200, response.text);
    assert.ok(response.body.results.length > 0);
  });

  it("doesn't list readers for a token without the pos scope", async () => {
    const { profile, token } = await setup("subscribers:read");

    const response = await requestApp
      .get(`manage/artists/${profile.id}/readers`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 403);
  });

  it("sends a purchase to a reader and returns the account to poll it on", async () => {
    const { profile, token } = await setup();
    const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

    const response = await requestApp
      .post("purchase")
      .set("Authorization", `Bearer ${token}`)
      .send({
        artistId: profile.id,
        readerId: "tmr_test",
        email: "fan@test.com",
        items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
      });

    assert.equal(response.status, 200, response.text);
    assert.ok(response.body.paymentIntentId);
    assert.equal(response.body.stripeAccountId, "acct_pos_scope");
  });

  it("doesn't sign the user in for a purchase that isn't sent to a reader", async () => {
    const { user: artist } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_pos_scope",
    });
    const profile = await createProfile(artist.id, {
      purchaseEntireCatalogMinPrice: 1500,
    });
    await createTrackGroup(profile.id, { minPrice: 1000 });
    const { user: buyer, accessToken } = await createUser({
      email: "buyer@test.com",
      emailConfirmationToken: null,
    });
    const client = await createOAuthClient({ applicationName: "POS plugin" });
    const { access_token } = await tokensFor(accessToken, client, "pos");

    const response = await requestApp
      .post("purchase")
      .set("Authorization", `Bearer ${access_token}`)
      .send({ artistId: profile.id, items: [{ type: "catalogue" }] });

    assert.equal(response.status, 200, response.text);
    const subscription = await prisma.profileUserSubscription.findFirst({
      where: { userId: buyer.id },
    });
    assert.equal(subscription, null);
  });

  it("doesn't send to a reader for a token without the pos scope", async () => {
    const { profile, token } = await setup("subscribers:read");
    const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

    const response = await requestApp
      .post("purchase")
      .set("Authorization", `Bearer ${token}`)
      .send({
        artistId: profile.id,
        readerId: "tmr_test",
        items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
      });

    assert.equal(response.status, 403);
  });

  for (const method of ["get", "delete"] as const) {
    it(`reaches ${method.toUpperCase()} purchase/:id`, async () => {
      const { token } = await setup();

      const response = await requestApp[method]("purchase/pi_not_mirlo")
        .query({ stripeAccountId: "acct_pos_scope" })
        .set("Authorization", `Bearer ${token}`);

      assert.equal(response.status, 404, response.text);
    });

    it(`refuses ${method.toUpperCase()} purchase/:id without the pos scope`, async () => {
      const { token } = await setup("subscribers:read");

      const response = await requestApp[method]("purchase/pi_not_mirlo")
        .query({ stripeAccountId: "acct_pos_scope" })
        .set("Authorization", `Bearer ${token}`);

      assert.equal(response.status, 403);
    });
  }
});
