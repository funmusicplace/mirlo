import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "../../../prisma/prisma";
import { buildTokens } from "../../../src/routers/auth";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("artists/{id}/feed", () => {
  beforeEach(async () => {
    try {
      await prisma.$executeRaw`DELETE FROM "ArtistUserSubscription";`;
      await prisma.$executeRaw`DELETE FROM "ArtistSubscriptionTier";`;
      await prisma.$executeRaw`DELETE FROM "Post";`;
      await prisma.$executeRaw`DELETE FROM "Artist";`;
      await prisma.$executeRaw`DELETE FROM "User";`;
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await request(baseURL)
      .get("artists/1/feed")
      .set("Accept", "application/json");

    assert(response.statusCode === 404);
  });

  it("should GET / empty result if artist has no posts", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
      },
    });

    const response = await request(baseURL)
      .get(`artists/${artist.id}/feed`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    assert(response.body.results.length === 0);
  });

  it("should GET / a public post", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
      },
    });

    const postTitle = "Test post";

    await prisma.post.create({
      data: {
        title: postTitle,
        artistId: artist.id,
        isPublic: true,
      },
    });

    const response = await request(baseURL)
      .get(`artists/${artist.id}/feed`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    assert(response.body.results.length === 1);
    assert(response.body.results[0].title === postTitle);
  });

  it("should not GET / a hidden post", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
      },
    });

    const postTitle = "Test post";

    await prisma.post.create({
      data: {
        title: postTitle,
        artistId: artist.id,
        isPublic: false,
      },
    });

    const response = await request(baseURL)
      .get(`artists/${artist.id}/feed`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    assert(response.body.results.length === 0);
    assert(response.body.results);
  });

  it("should GET / a hidden post if the user is subscribed at the minimum tier", async () => {
    const artistUser = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const followerUser = await prisma.user.create({
      data: {
        email: "follower@follower.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const postTitle = "Test post";

    await prisma.post.create({
      data: {
        title: postTitle,
        artistId: artist.id,
        isPublic: false,
        minimumSubscriptionTierId: artist.subscriptionTiers[0].id,
      },
    });

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const { accessToken } = buildTokens(followerUser);

    const response = await request(baseURL)
      .get(`artists/${artist.id}/feed`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    assert(response.body.results.length === 1);
    assert(response.body.results[0].title === postTitle);
  });

  it("should GET / a hidden post if the user is subscribed above the minimum tier", async () => {
    const artistUser = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const followerUser = await prisma.user.create({
      data: {
        email: "follower@follower.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          createMany: {
            data: [
              { name: "minimum tier", minAmount: 5 },
              { name: "follower tier", minAmount: 10 },
            ],
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const postTitle = "Test post";
    const minTier = artist.subscriptionTiers[0];
    const maxTier = artist.subscriptionTiers[1];

    console.log("minTier", minTier);

    await prisma.post.create({
      data: {
        title: postTitle,
        artistId: artist.id,
        isPublic: false,
        minimumSubscriptionTierId: minTier.id,
      },
    });

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: maxTier.id,
        amount: 10,
      },
    });

    const { accessToken } = buildTokens(followerUser);

    const response = await request(baseURL)
      .get(`artists/${artist.id}/feed`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, postTitle);
  });
});
