import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import Parser from "rss-parser";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";

import { requestApp } from "../utils";
import { faker } from "@faker-js/faker";

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
        isDraft: false,
      },
    });

    const response = await requestApp
      .get(`artists/${artist.id}/feed`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    assert(response.body.results.length === 1);
    assert.equal(response.body.results[0].title, `${postTitle}`);
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
        isDraft: false,
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
      `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`
    );
    assert.equal(obj.title, `${artist.name} Feed`);
    assert.equal(obj.items.length, 1);
    assert(obj.items[0].content?.includes("<h2"));
    assert.equal(obj.items[0].title, `${postTitle} by ${artist.name}`);
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
        isDraft: false,
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
        isDraft: false,
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
    assert.equal(response.body.results[0].title, `${postTitle}`);
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
        isDraft: false,
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
    assert.equal(response.body.results[0].title, `${postTitle}`);
  });

  it("should GET / an album and display it in RSS", async () => {
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

    const trackGroup = await createTrackGroup(artist.id);

    const response = await requestApp
      .get(`artists/${artist.id}/feed?format=rss`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    let parser = new Parser();
    const obj = await parser.parseString(response.text);
    assert(response.text);
    assert.equal(
      obj.feedUrl,
      `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`
    );
    assert.equal(obj.title, `${artist.name} Feed`);
    assert.equal(obj.items.length, 1);
    assert(obj.items[0].content?.includes(""));
    assert.equal(obj.items[0].title, `${trackGroup.title} by ${artist.name}`);
  });

  it("should GET / not display an album if it's not public", async () => {
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

    await createTrackGroup(artist.id, { published: false });

    const response = await requestApp
      .get(`artists/${artist.id}/feed?format=rss`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    let parser = new Parser();
    const obj = await parser.parseString(response.text);
    assert(response.text);
    assert.equal(
      obj.feedUrl,
      `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`
    );
    assert.equal(obj.title, `${artist.name} Feed`);
    assert.equal(obj.items.length, 0);
  });

  it("should GET / both an album and a post and display it in RSS", async () => {
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

    const postTitle = "Test post title";

    await prisma.post.create({
      data: {
        title: postTitle,
        artistId: artist.id,
        isPublic: true,
        isDraft: false,
        content: "# HI",
        publishedAt: faker.date.past().toISOString(),
      },
    });

    const trackGroup = await createTrackGroup(artist.id);

    const response = await requestApp
      .get(`artists/${artist.id}/feed?format=rss`)
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
    let parser = new Parser();
    const obj = await parser.parseString(response.text);
    assert(response.text);
    assert.equal(
      obj.feedUrl,
      `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`
    );

    assert.equal(obj.title, `${artist.name} Feed`);
    assert.equal(obj.items.length, 2);
    assert(obj.items[0].content?.includes(""));
    assert.equal(obj.items[0].title, `${trackGroup.title} by ${artist.name}`);
    assert.equal(obj.items[1].title, `${postTitle} by ${artist.name}`);
  });

  describe("ActivityPub", () => {
    it("should GET / both an album and a post and display it in outbox", async () => {
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

      const postTitle = "Test post title";

      const post = await prisma.post.create({
        data: {
          title: postTitle,
          artistId: artist.id,
          isPublic: true,
          content: "# HI",
          isDraft: false,
          publishedAt: faker.date.past().toISOString(),
        },
      });

      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .get(`artists/${artist.urlSlug}/feed`)
        .set("Accept", "application/activity+json");

      assert(response.statusCode === 200);
      const first = response.body.first;
      assert.equal(response.body.type, "OrderedCollection");
      assert.equal(response.body.totalItems, 2);
      assert(response.body.id.includes(`v1/artists/${artist.urlSlug}/feed`));
      assert.equal(first.type, "OrderedCollectionPage");
      assert(first.partOf.includes(`v1/artists/${artist.urlSlug}/feed`));
      assert(first.id.includes(`v1/artists/${artist.urlSlug}/feed?page=1`));
      assert.equal(first.orderedItems.length, 2);
      assert.equal(
        response.body["@context"][0],
        "https://www.w3.org/ns/activitystreams"
      );
      const firstItem = first.orderedItems[0];
      assert(
        firstItem.id.endsWith(
          `v1/artists/${artist.urlSlug}/trackGroups/${trackGroup.urlSlug}`
        )
      );
      assert(
        firstItem.url.endsWith(
          `${artist.urlSlug}/releases/${trackGroup.urlSlug}`
        )
      );
      assert(firstItem.attributedTo.endsWith(`/${artist.urlSlug}`));
      assert.equal(firstItem.type, "Note");
      assert.equal(
        firstItem.content,
        `<h2>An album release by artist ${artist.name}.</h2>`
      );
      assert.equal(firstItem.published, trackGroup.releaseDate.toISOString());
      const secondItem = first.orderedItems[1];
      assert(
        secondItem.id.endsWith(`v1/artists/${artist.urlSlug}/posts/${post.id}`)
      );
      assert(secondItem.url.endsWith(`${artist.urlSlug}/posts/${post.id}`));
      assert(secondItem.attributedTo.endsWith(`/${artist.urlSlug}`));
      assert.equal(secondItem.type, "Note");
      assert.equal(secondItem.content, post.content);
      assert.equal(secondItem.published, post.publishedAt.toISOString());
    });
  });
});
