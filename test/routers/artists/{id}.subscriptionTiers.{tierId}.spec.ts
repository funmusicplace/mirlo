import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createTier,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("artists/{id}/subscriptionTiers/{tierId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET a hidden tier by slug or id", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id, { urlSlug: "artist" });
    const tier = await createTier(profile.id, {
      name: "Secret",
      urlSlug: "secret",
      hiddenAt: new Date(),
    });

    for (const tierId of ["SECRET", String(tier.id)]) {
      const response = await requestApp
        .get(`artists/${profile.urlSlug}/subscriptionTiers/${tierId}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, tier.id);
      assert.equal(response.body.result.artistId, profile.id);
      assert.ok(response.body.result.hiddenAt);
    }
  });

  it("should still mark a hidden tier's releases as subscriber exclusive", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id, { urlSlug: "artist" });
    const tier = await createTier(profile.id, { hiddenAt: new Date() });
    const exclusive = await createTrackGroup(profile.id, {
      title: "Exclusive",
      urlSlug: "exclusive",
      isGettable: false,
    });
    await prisma.subscriptionTierRelease.create({
      data: { tierId: tier.id, trackGroupId: exclusive.id },
    });

    const response = await requestApp
      .get(`artists/${profile.urlSlug}/subscriptionTiers/${tier.id}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.body.result.releases[0].trackGroup.isSubscriberExclusive,
      true
    );
  });

  it("should 404 for deleted, default, or another artist's tiers", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const other = await createProfile(user.id, { urlSlug: "other" });
    const deleted = await createTier(profile.id);
    await prisma.profileSubscriptionTier.delete({ where: { id: deleted.id } });
    const defaultTier = await createTier(profile.id, { isDefaultTier: true });
    const otherTier = await createTier(other.id);

    for (const tierId of [deleted.id, defaultTier.id, otherTier.id]) {
      const response = await requestApp
        .get(`artists/${profile.id}/subscriptionTiers/${tierId}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    }
  });
});
