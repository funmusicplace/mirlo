import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createTier,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/subscriptionPayouts", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("counts active paid subscriptions that pay out to an account other than the current payee", async () => {
    const { user: artistUser, accessToken } = await createUser({
      email: "artist@example.com",
      stripeAccountId: "acct_current",
    });
    const artist = await createArtist(artistUser.id);
    const tier = await createTier(artist.id, { minAmount: 500 });
    const subscriptions = [
      { stripeSubscriptionKey: "sub_here", stripeAccountId: "acct_current" },
      { stripeSubscriptionKey: "sub_elsewhere", stripeAccountId: "acct_old" },
      {
        stripeSubscriptionKey: "sub_cancelling",
        stripeAccountId: "acct_old",
        deleteReason: "USER_CANCELLED" as const,
      },
      { stripeSubscriptionKey: null, stripeAccountId: null },
    ];
    for (const [i, data] of subscriptions.entries()) {
      const { user } = await createUser({ email: `fan${i}@example.com` });
      await prisma.profileUserSubscription.create({
        data: {
          ...data,
          profileSubscriptionTierId: tier.id,
          userId: user.id,
          amount: 500,
        },
      });
    }

    const response = await requestApp
      .get(`manage/artists/${artist.id}/subscriptionPayouts`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.result, {
      paidSubscriptions: 2,
      onOtherAccounts: 1,
    });
  });

  it("isn't available to someone who doesn't manage the artist", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@example.com",
    });
    const { accessToken } = await createUser({ email: "other@example.com" });
    const artist = await createArtist(artistUser.id);

    const response = await requestApp
      .get(`manage/artists/${artist.id}/subscriptionPayouts`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.notEqual(response.statusCode, 200);
  });
});
