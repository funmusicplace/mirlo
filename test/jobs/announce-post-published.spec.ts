import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createPost, createUser } from "../utils";

import addPostToNotifications from "../../src/jobs/add-post-to-notifications";
import prisma from "../../prisma/prisma";
import assert from "assert";

describe("add-post-to-notifications", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should add post to notifications", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
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

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await createPost(artist.id, {
      title: "Our Custom Title",
      content: "# HI",
    });

    await addPostToNotifications();

    const note = await prisma.notification.findFirst({});
    assert.notEqual(note, null);
    assert.equal(note?.isRead, false);
    assert.equal(note?.notificationType, "NEW_ARTIST_POST");
  });

  it("should not add a post twice to notifications", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
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

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await createPost(artist.id, {
      title: "Our Custom Title",
      content: "# HI",
    });

    await addPostToNotifications();
    await addPostToNotifications();

    const notes = await prisma.notification.findMany({});
    assert.equal(notes.length, 1);
  });
});
