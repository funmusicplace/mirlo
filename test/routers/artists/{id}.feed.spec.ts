import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "../../../prisma/prisma";
import Parser from "rss-parser";
import { clearTables, createArtist, createUser } from "../../utils";

import { requestApp } from "../utils";

describe("artists/{id}/feed", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await requestApp
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

    const response = await requestApp
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

    const response = await requestApp
      .get(`artists/${artist.id}/feed`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    assert(response.body.results.length === 1);
    assert(response.body.results[0].title === postTitle);
  });

  it("should GET / a public post and display it in RSS", async () => {
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
        content: "# HI",
      },
    });

    const response = await requestApp
      .get(`artists/${artist.id}/feed?format=rss`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    let parser = new Parser();
    const obj = await parser.parseString(response.text);
    assert(response.text);
    assert.equal(
      obj.feedUrl,
      `${process.env.API_DOMAIN}/v1/${artist.urlSlug}/feed?format=rss`
    );
    assert.equal(obj.title, `${artist.name} Posts`);
    assert.equal(obj.items.length, 1);
    assert(obj.items[0].content?.includes("<h2"));
    assert.equal(obj.items[0].title, postTitle);
  });

  it("should not GET / a hidden post", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await createArtist(user.id);

    const postTitle = "Test post";

    await prisma.post.create({
      data: {
        title: postTitle,
        artistId: artist.id,
        isPublic: false,
      },
    });

    const response = await requestApp
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
    const { user: followerUser, accessToken } = await createUser({
      email: "follower@follower.com",
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

    const response = await requestApp
      .get(`artists/${artist.id}/feed`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, postTitle);
  });

  it("should GET / a hidden post if the user is subscribed above the minimum tier", async () => {
    const artistUser = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const { user: followerUser, accessToken } = await createUser({
      email: "follower@follower.com",
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

    const response = await requestApp
      .get(`artists/${artist.id}/feed`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, postTitle);
  });
});
