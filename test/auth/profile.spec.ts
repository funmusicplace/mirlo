import assert from "assert";

import prisma from "@mirlo/prisma";
import jwt from "jsonwebtoken";
import request from "supertest";

import { clearTables, createProfile, createTier, createUser } from "../utils";

const authRequestApp = request(`${process.env.API_DOMAIN}/auth/`);

describe("auth/profile", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("rejects a JWT that isn't a session token", async () => {
    await createUser({ email: "first@test.com" });
    const playToken = jwt.sign(
      { song: 1, userid: "listener" },
      process.env.JWT_SECRET ?? "",
      { expiresIn: "2d", audience: "playtoken" }
    );

    const response = await authRequestApp
      .get("profile")
      .set("Cookie", [`jwt=${playToken}`]);

    assert.equal(response.status, 401);
  });

  it("includes what the tier switcher needs to know about each subscription", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer, accessToken } = await createUser({
      email: "buyer@test.com",
    });
    const profile = await createProfile(artistUser.id);
    const tier = await createTier(profile.id, {
      minAmount: 500,
      collectAddress: true,
    });
    const shippingAddress = { name: "Buyer", address: { country: "US" } };
    await prisma.profileUserSubscription.create({
      data: {
        profileSubscriptionTierId: tier.id,
        userId: buyer.id,
        amount: 500,
        stripeSubscriptionKey: "sub_profile",
        shippingAddress,
      },
    });

    const response = await authRequestApp
      .get("profile")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const [subscription] = response.body.result.artistUserSubscriptions;
    assert.equal(subscription.isPaid, true);
    assert.deepEqual(subscription.shippingAddress, shippingAddress);
    assert.equal("stripeSubscriptionKey" in subscription, false);
  });
});
