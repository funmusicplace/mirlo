import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
dotenv.config();

import { createOAuthClient, tokensFor } from "../../../auth/oidc/utils";
import {
  clearTables,
  createProfile,
  createTier,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/subscribers/active", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const setup = async () => {
    const { user: owner, accessToken: ownerSession } = await createUser({
      email: "owner@example.com",
      emailConfirmationToken: null,
      currency: "eur",
    });
    const profile = await createProfile(owner.id);
    const tier = await createTier(profile.id, { name: "Supporter" });
    const fans = await Promise.all(
      ["active", "cancelling", "gone"].map((name) =>
        createUser({ email: `${name}@example.com`, name })
      )
    );
    const [active, cancelling, gone] = await Promise.all(
      fans.map(({ user }) =>
        prisma.profileUserSubscription.create({
          data: {
            userId: user.id,
            profileSubscriptionTierId: tier.id,
            amount: 500,
          },
        })
      )
    );
    await prisma.profileUserSubscription.update({
      where: { id: cancelling.id },
      data: { deleteReason: "USER_CANCELLED" },
    });
    await prisma.profileUserSubscription.delete({ where: { id: gone.id } });
    const client = await createOAuthClient({ applicationName: "WP site" });
    return { owner, ownerSession, profile, tier, active, cancelling, client };
  };

  const get = (profileId: number, token: string) =>
    requestApp
      .get(`manage/artists/${profileId}/subscribers/active`)
      .set("Authorization", `Bearer ${token}`);

  it("lists active and cancelling subscribers for a subscribers:read token", async () => {
    const { ownerSession, profile, tier, active, cancelling, client } =
      await setup();
    const tokens = await tokensFor(ownerSession, client, "subscribers:read");

    const response = await get(profile.id, tokens.access_token);
    assert.equal(response.status, 200, response.text);
    const byEmail = Object.fromEntries(
      response.body.results.map((r: { email: string }) => [r.email, r])
    );
    assert.deepEqual(Object.keys(byEmail).sort(), [
      "active@example.com",
      "cancelling@example.com",
    ]);
    assert.equal(byEmail["active@example.com"].id, active.id);
    assert.equal(byEmail["active@example.com"].status, "active");
    assert.equal(byEmail["cancelling@example.com"].id, cancelling.id);
    assert.equal(byEmail["cancelling@example.com"].status, "cancelling");
    assert.equal(byEmail["active@example.com"].tierId, tier.id);
    assert.equal(byEmail["active@example.com"].tierName, "Supporter");
    assert.equal(byEmail["active@example.com"].amount, 500);
    assert.equal(byEmail["active@example.com"].currency, "eur");
    assert.equal(byEmail["active@example.com"].shippingAddress, undefined);
  });

  it("marks followers as unpaid and filters on paid", async () => {
    const { ownerSession, profile, client } = await setup();
    const followTier = await createTier(profile.id, {
      name: "follow",
      isDefaultTier: true,
    });
    const { user: follower } = await createUser({
      email: "follower@example.com",
    });
    await prisma.profileUserSubscription.create({
      data: {
        userId: follower.id,
        profileSubscriptionTierId: followTier.id,
        amount: 0,
      },
    });
    const tokens = await tokensFor(ownerSession, client, "subscribers:read");
    const emails = async (query: string) => {
      const response = await requestApp
        .get(`manage/artists/${profile.id}/subscribers/active${query}`)
        .set("Authorization", `Bearer ${tokens.access_token}`);
      assert.equal(response.status, 200, response.text);
      return response.body.results
        .map((r: { email: string; paid: boolean }) => `${r.email}:${r.paid}`)
        .sort();
    };

    assert.deepEqual(await emails(""), [
      "active@example.com:true",
      "cancelling@example.com:true",
      "follower@example.com:false",
    ]);
    assert.deepEqual(await emails("?paid=true"), [
      "active@example.com:true",
      "cancelling@example.com:true",
    ]);
    assert.deepEqual(await emails("?paid=false"), [
      "follower@example.com:false",
    ]);

    const invalid = await requestApp
      .get(`manage/artists/${profile.id}/subscribers/active?paid=yes`)
      .set("Authorization", `Bearer ${tokens.access_token}`);
    assert.equal(invalid.status, 400);
  });

  it("accepts the api scope and the owner's own session", async () => {
    const { ownerSession, profile, client } = await setup();
    const tokens = await tokensFor(ownerSession, client, "api");
    assert.equal((await get(profile.id, tokens.access_token)).status, 200);

    const viaCookie = await requestApp
      .get(`manage/artists/${profile.id}/subscribers/active`)
      .set("Cookie", [`jwt=${ownerSession}`]);
    assert.equal(viaCookie.status, 200);
  });

  it("refuses a token without the scope", async () => {
    const { ownerSession, profile, client } = await setup();
    const tokens = await tokensFor(ownerSession, client, "openid profile");
    const response = await get(profile.id, tokens.access_token);
    assert.equal(response.status, 403);
    assert.match(response.headers["www-authenticate"], /subscribers:read/);
  });

  it("404s for users who can't edit the artist, admins included", async () => {
    const { profile, client } = await setup();
    for (const isAdmin of [false, true]) {
      const { accessToken } = await createUser({
        email: `someone-${isAdmin}@example.com`,
        emailConfirmationToken: null,
        isAdmin,
      });
      const tokens = await tokensFor(accessToken, client, "subscribers:read");
      const response = await get(profile.id, tokens.access_token);
      assert.equal(response.status, 404, `isAdmin: ${isAdmin}`);
    }
  });
});
