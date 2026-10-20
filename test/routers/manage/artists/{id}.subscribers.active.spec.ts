import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
dotenv.config();

import { createOAuthClient, tokensFor } from "../../../auth/oidc/utils";
import {
  clearTables,
  createArtist,
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
    const artist = await createArtist(owner.id);
    const tier = await createTier(artist.id, { name: "Supporter" });
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
    return { owner, ownerSession, artist, tier, active, cancelling, client };
  };

  const get = (artistId: number, token: string) =>
    requestApp
      .get(`manage/artists/${artistId}/subscribers/active`)
      .set("Authorization", `Bearer ${token}`);

  it("lists active and cancelling supporters for a subscribers:read token", async () => {
    const { ownerSession, artist, tier, active, cancelling, client } =
      await setup();
    const tokens = await tokensFor(ownerSession, client, "subscribers:read");

    const response = await get(artist.id, tokens.access_token);
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

  it("accepts the account scope and the owner's own session", async () => {
    const { ownerSession, artist, client } = await setup();
    const tokens = await tokensFor(ownerSession, client, "account");
    assert.equal((await get(artist.id, tokens.access_token)).status, 200);

    const viaCookie = await requestApp
      .get(`manage/artists/${artist.id}/subscribers/active`)
      .set("Cookie", [`jwt=${ownerSession}`]);
    assert.equal(viaCookie.status, 200);
  });

  it("refuses a token without the scope", async () => {
    const { ownerSession, artist, client } = await setup();
    const tokens = await tokensFor(ownerSession, client, "openid profile");
    const response = await get(artist.id, tokens.access_token);
    assert.equal(response.status, 403);
    assert.match(response.headers["www-authenticate"], /subscribers:read/);
  });

  it("404s for users who can't edit the artist, admins included", async () => {
    const { artist, client } = await setup();
    for (const isAdmin of [false, true]) {
      const { accessToken } = await createUser({
        email: `someone-${isAdmin}@example.com`,
        emailConfirmationToken: null,
        isAdmin,
      });
      const tokens = await tokensFor(accessToken, client, "subscribers:read");
      const response = await get(artist.id, tokens.access_token);
      assert.equal(response.status, 404, `isAdmin: ${isAdmin}`);
    }
  });
});
