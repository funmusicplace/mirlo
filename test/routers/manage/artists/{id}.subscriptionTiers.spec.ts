import assert from "node:assert";

import { faker } from "@faker-js/faker";
import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import * as sendMailQueueModule from "../../../../src/queues/send-mail-queue";
import {
  clearTables,
  createArtist,
  createProfile,
  createTier,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/subscriptionTiers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(async () => {
    await sendMailQueueModule.sendMailQueue.close();
    await sendMailQueueModule.sendMailQueueEvents.close();
  });

  describe("POST", () => {
    it("should POST / content", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const title = faker.lorem.words(2);

      const artist = await createArtist(user.id);
      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscriptionTiers`)
        .send({
          name: title,
          description: "description",
          minAmount: 500,
          allowVariable: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(response.body.result.name, title);
      assert.equal(response.body.result.minAmount, 500);
      assert.equal(response.body.result.allowVariable, true);
      assert.equal(response.statusCode, 200);
    });

    it("should derive a urlSlug from the name and suffix duplicates", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const create = () =>
        requestApp
          .post(`manage/artists/${artist.id}/subscriptionTiers`)
          .send({ name: "Inner Circle", minAmount: 500 })
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

      const first = await create();
      const second = await create();

      assert.equal(first.body.result.urlSlug, "inner-circle");
      assert.equal(second.body.result.urlSlug, "inner-circle-2");
    });

    it("should not reuse the urlSlug of a deleted tier", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const create = () =>
        requestApp
          .post(`manage/artists/${artist.id}/subscriptionTiers`)
          .send({ name: "Gold", minAmount: 500 })
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

      const first = await create();
      await requestApp
        .delete(
          `manage/artists/${artist.id}/subscriptionTiers/${first.body.result.id}`
        )
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const second = await create();

      assert.equal(second.statusCode, 200);
      assert.equal(second.body.result.urlSlug, "gold-2");
    });

    it("should link an image belonging to the artist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const image = await prisma.image.create({
        data: { dimensions: "square", profileId: artist.id },
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscriptionTiers`)
        .send({ name: "Gold", minAmount: 500, imageId: image.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const links = await prisma.subscriptionTierImage.findMany({
        where: { tierId: response.body.result.id },
      });
      assert.deepEqual(
        links.map((l) => l.imageId),
        [image.id]
      );
    });

    it("should not link another artist's image", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });
      const otherArtist = await createArtist(otherUser.id, {
        urlSlug: "other",
      });
      const otherImage = await prisma.image.create({
        data: { dimensions: "square", profileId: otherArtist.id },
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscriptionTiers`)
        .send({ name: "Gold", minAmount: 500, imageId: otherImage.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(
        await prisma.profileSubscriptionTier.count({
          where: { profileId: artist.id },
        }),
        0
      );
    });
  });
});

describe("manage/artists/{artistId}/subscriptionTiers/{tierId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should PUT new details", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const title = faker.lorem.words(2);

      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id);
      const response = await requestApp
        .put(`manage/artists/${artist.id}/subscriptionTiers/${tier.id}`)
        .send({
          allowVariable: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.result.allowVariable, true);
      assert.equal(response.statusCode, 200);
    });

    it("should refresh the urlSlug when the tier is renamed and keep it otherwise", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { name: "Untitled Tier" });
      const put = (body: Record<string, unknown>) =>
        requestApp
          .put(`manage/artists/${artist.id}/subscriptionTiers/${tier.id}`)
          .send(body)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

      const renamed = await put({ name: "Supporter", minAmount: 500 });
      assert.equal(renamed.body.result.urlSlug, "supporter");

      const untouched = await put({ name: "Supporter", minAmount: 700 });
      assert.equal(untouched.body.result.urlSlug, "supporter");
    });

    it("should let an admin PUT details for a tier belonging to another user", async () => {
      const { user } = await createUser({
        email: "test@test.com",
      });
      const { accessToken: adminAccessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });

      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id);
      const response = await requestApp
        .put(`manage/artists/${artist.id}/subscriptionTiers/${tier.id}`)
        .send({
          allowVariable: true,
        })
        .set("Cookie", [`jwt=${adminAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.result.allowVariable, true);
      assert.equal(response.statusCode, 200);
    });

    it("should not link another artist's image", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id);
      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });
      const otherArtist = await createArtist(otherUser.id, {
        urlSlug: "other",
      });
      const otherImage = await prisma.image.create({
        data: { dimensions: "square", profileId: otherArtist.id },
      });

      const response = await requestApp
        .put(`manage/artists/${artist.id}/subscriptionTiers/${tier.id}`)
        .send({ minAmount: 500, imageId: otherImage.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(
        await prisma.subscriptionTierImage.count({
          where: { tierId: tier.id },
        }),
        0
      );
    });
  });
});

describe("manage/artists/{artistId}/subscriptionTierOrder", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("reorders tiers and places newly created (un-ordered) tiers last by minAmount", async () => {
    const { user, accessToken } = await createUser({
      email: "test@test.com",
    });
    const artist = await createProfile(user.id);
    const tierLow = await createTier(artist.id, {
      name: "Bronze",
      minAmount: 300,
    });
    const tierMid = await createTier(artist.id, {
      name: "Silver",
      minAmount: 700,
    });
    const tierHigh = await createTier(artist.id, {
      name: "Gold",
      minAmount: 1500,
    });

    const reorderRes = await requestApp
      .put(`manage/artists/${artist.id}/subscriptionTierOrder`)
      .send({ tierIds: [tierHigh.id, tierLow.id, tierMid.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(reorderRes.statusCode, 200);
    assert.deepEqual(
      reorderRes.body.results.map((t: { id: number }) => t.id),
      [tierHigh.id, tierLow.id, tierMid.id]
    );

    const newTier = await createTier(artist.id, {
      name: "Starter",
      minAmount: 100,
    });

    const manageGetRes = await requestApp
      .get(`manage/artists/${artist.id}/subscriptionTiers`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(manageGetRes.statusCode, 200);
    assert.deepEqual(
      manageGetRes.body.results.map((t: { id: number }) => t.id),
      [tierHigh.id, tierLow.id, tierMid.id, newTier.id]
    );

    const publicGetRes = await requestApp
      .get(`artists/${artist.id}`)
      .set("Accept", "application/json");

    assert.equal(publicGetRes.statusCode, 200);
    assert.deepEqual(
      publicGetRes.body.result.subscriptionTiers.map(
        (t: { id: number }) => t.id
      ),
      [tierHigh.id, tierLow.id, tierMid.id, newTier.id]
    );
  });

  it("does not update order of tiers belonging to another artist", async () => {
    const { user, accessToken } = await createUser({
      email: "test@test.com",
    });
    const artist = await createProfile(user.id);
    const ownTier = await createTier(artist.id, {
      name: "Own",
      minAmount: 500,
    });

    const { user: otherUser } = await createUser({
      email: "other@test.com",
    });
    const otherArtist = await createProfile(otherUser.id, { urlSlug: "other" });
    const otherTier = await createTier(otherArtist.id, {
      name: "Other",
      minAmount: 500,
    });

    const res = await requestApp
      .put(`manage/artists/${artist.id}/subscriptionTierOrder`)
      .send({ tierIds: [otherTier.id, ownTier.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(res.statusCode, 200);
    const refreshedOther = await prisma.profileSubscriptionTier.findUnique({
      where: { id: otherTier.id },
    });
    assert.equal(refreshedOther?.order, null);
  });
});

describe("manage/artists/{artistId}/subscriptionTiers/{tierId}/releases", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should not add another artist's release to a tier", async () => {
    const { user, accessToken } = await createUser({ email: "a@test.com" });
    const artist = await createArtist(user.id);
    const tier = await createTier(artist.id);
    await prisma.profileUserSubscription.create({
      data: { userId: user.id, profileSubscriptionTierId: tier.id, amount: 0 },
    });

    const { user: victim } = await createUser({ email: "victim@test.com" });
    const victimArtist = await createArtist(victim.id);
    const victimRelease = await createTrackGroup(victimArtist.id, {
      publishedAt: null,
    });

    const response = await requestApp
      .post(`manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releases`)
      .send({ trackGroupId: victimRelease.id })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
    assert.equal(
      await prisma.subscriptionTierRelease.count({
        where: { tierId: tier.id },
      }),
      0
    );
    assert.equal(
      await prisma.userTrackGroupPurchase.count({
        where: { trackGroupId: victimRelease.id },
      }),
      0
    );
  });

  it("should add the artist's own release to a tier", async () => {
    const { user, accessToken } = await createUser({ email: "a@test.com" });
    const artist = await createArtist(user.id);
    const tier = await createTier(artist.id);
    const release = await createTrackGroup(artist.id);

    const response = await requestApp
      .post(`manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releases`)
      .send({ trackGroupId: release.id })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 201);
    assert.equal(
      await prisma.subscriptionTierRelease.count({
        where: { tierId: tier.id },
      }),
      1
    );
  });

  it("should let a label add a release it's paid for to its tier", async () => {
    const { user: labelUser, accessToken } = await createUser({
      email: "label@test.com",
    });
    const label = await createArtist(labelUser.id);
    const tier = await createTier(label.id);

    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const artist = await createArtist(artistUser.id);
    const release = await createTrackGroup(artist.id, {
      paymentToUserId: labelUser.id,
    });

    const response = await requestApp
      .post(`manage/artists/${label.id}/subscriptionTiers/${tier.id}/releases`)
      .send({ trackGroupId: release.id })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 201);
  });

  it("should let a label add a release by an artist that granted it release rights", async () => {
    const { user: labelUser, accessToken } = await createUser({
      email: "label@test.com",
    });
    const label = await createArtist(labelUser.id);
    const tier = await createTier(label.id);

    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const artist = await createArtist(artistUser.id);
    await prisma.artistLabel.create({
      data: {
        labelUserId: labelUser.id,
        artistId: artist.id,
        canLabelAddReleases: true,
        isArtistApproved: true,
        isLabelApproved: true,
      },
    });
    const release = await createTrackGroup(artist.id);

    const response = await requestApp
      .post(`manage/artists/${label.id}/subscriptionTiers/${tier.id}/releases`)
      .send({ trackGroupId: release.id })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 201);
  });
});
