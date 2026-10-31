import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

const createSale = async (userId: number, amount: number) =>
  prisma.userTransaction.create({
    data: { userId, amount, currency: "usd", platformCut: 0, stripeCut: 0 },
  });

describe("trackGroups/{id}/supporters", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await requestApp
      .get("trackGroups/1/supporters")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / only totals for this release", async () => {
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user } = await createUser({ email: "supporter@test.com" });
    const profile = await createProfile(artistUser.id);
    const trackGroup = await createTrackGroup(profile.id, {
      urlSlug: "release",
    });
    const otherTrackGroup = await createTrackGroup(profile.id, {
      urlSlug: "other-release",
    });

    const purchase = await createSale(user.id, 1000);
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: user.id,
        userTransactionId: purchase.id,
        trackGroupId: trackGroup.id,
        message: "private note",
      },
    });

    const otherPurchase = await createSale(user.id, 500);
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: user.id,
        userTransactionId: otherPurchase.id,
        trackGroupId: otherTrackGroup.id,
      },
    });

    const tip = await createSale(user.id, 3000);
    await prisma.userProfileTip.create({
      data: { userId: user.id, profileId: profile.id, transactionId: tip.id },
    });

    const response = await requestApp
      .get(`trackGroups/${trackGroup.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results, undefined);
    assert.equal(response.body.total, 1);
    assert.equal(response.body.totalAmount, 1000);
    assert.equal(response.body.totalSupporters, 1);
  });

  it("should not serve the artist-wide supporters list", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const profile = await createProfile(user.id);

    const response = await requestApp
      .get(`artists/${profile.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });
});
