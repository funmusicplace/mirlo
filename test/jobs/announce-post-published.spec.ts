import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createPost, createUser } from "../utils";

import announcePublishPost from "../../src/jobs/announce-post-published";
import prisma from "../../prisma/prisma";

describe("announce-post-published", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should send out an announcement email", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
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

    await announcePublishPost();
  });

  // FIXME: to implement this we need to actually have a way to test
  // what the job spits out (ie test the emails being sent). Can we
  // mock sendMail?
  it.skip("should not send out an announcement email to user without a confirmed email", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: "asdfasdf",
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

    await announcePublishPost();
  });
});
