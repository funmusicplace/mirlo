import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import sinon from "sinon";

import sendPostNotification from "../../src/jobs/send-post-notification";
import { sendMailQueue } from "../../src/queues/send-mail-queue";
import { clearTables, createUser } from "../utils";

describe("send-post-notification", () => {
  let mailQueueStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    mailQueueStub = sinon.stub(sendMailQueue, "add").resolves({} as any);
  });

  afterEach(() => {
    mailQueueStub.restore();
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  // A sentinel value meaning "omit emailConfirmationToken so the DB default UUID applies"
  const UNCONFIRMED = Symbol("UNCONFIRMED");

  async function createArtistWithSubscriber(
    subscriberEmail: string,
    subscriberOverrides: {
      emailConfirmationToken?: typeof UNCONFIRMED | null;
      deletedAt?: Date | null;
    } = {}
  ) {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      emailConfirmationToken: null,
    });
    const tokenOverride = subscriberOverrides.emailConfirmationToken;
    const { user: subscriber } = await createUser({
      email: subscriberEmail,
      // null = confirmed (explicit); UNCONFIRMED = let DB set uuid default
      ...(tokenOverride !== UNCONFIRMED && {
        emailConfirmationToken: tokenOverride ?? null,
      }),
      ...(subscriberOverrides.deletedAt !== undefined && {
        deletedAt: subscriberOverrides.deletedAt,
      }),
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test Profile",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: { create: { name: "Fan tier" } },
      },
      include: { subscriptionTiers: true },
    });

    await prisma.profileUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    return { artist, subscriber };
  }

  async function createPublishedPost(
    artistId: number,
    overrides: Record<string, any> = {}
  ) {
    return prisma.post.create({
      data: {
        title: "Test Post",
        artistId,
        content: "Hello world",
        isDraft: false,
        isPublic: true,
        shouldSendEmail: true,
        urlSlug: "test-post",
        publishedAt: new Date(),
        hasAnnounceEmailBeenSent: false,
        ...overrides,
      },
    });
  }

  // ── Basic behaviour ────────────────────────────────────────────────────────

  it("queues an email for each confirmed subscriber", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id);

    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(mailQueueStub.callCount, 1);
    const [, jobData] = mailQueueStub.firstCall.args;
    assert.strictEqual(jobData.template, "announce-post-published");
    assert.strictEqual(jobData.message.to, "sub@test.com");
  });

  it("creates a NEW_ARTIST_POST notification in the DB", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id);

    await sendPostNotification({ data: { postId: post.id } });

    const notification = await prisma.notification.findFirst({
      where: { postId: post.id, notificationType: "NEW_ARTIST_POST" },
    });
    assert.ok(notification, "notification should exist");
  });

  it("marks the post as hasAnnounceEmailBeenSent after processing", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id);

    await sendPostNotification({ data: { postId: post.id } });

    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    assert.strictEqual(updated?.hasAnnounceEmailBeenSent, true);
  });

  // ── Claim / idempotency (the triple-send regression) ──────────────────────

  it("only sends emails once when called twice sequentially for the same post", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id);

    // Simulates two BullMQ jobs created for the same post (e.g. cron fired
    // twice before hasAnnounceEmailBeenSent was set, or 3-attempt retry loop).
    await sendPostNotification({ data: { postId: post.id } });
    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(
      mailQueueStub.callCount,
      1,
      "email should be queued exactly once across both executions"
    );
  });

  it("skips immediately when post is already marked as sent", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id, {
      hasAnnounceEmailBeenSent: true,
    });

    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(mailQueueStub.callCount, 0);
  });

  it("uses a stable jobId per notification to support BullMQ deduplication", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id);

    await sendPostNotification({ data: { postId: post.id } });

    const [, , jobOptions] = mailQueueStub.firstCall.args;
    assert.ok(
      typeof jobOptions?.jobId === "string" &&
        jobOptions.jobId.startsWith(`announce-post-published-${post.id}-`),
      `jobId should be stable and scoped to postId, got: ${jobOptions?.jobId}`
    );
  });

  // ── Skip conditions ────────────────────────────────────────────────────────

  it("skips draft posts", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id, { isDraft: true });

    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(mailQueueStub.callCount, 0);
    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    assert.strictEqual(updated?.hasAnnounceEmailBeenSent, false);
  });

  it("skips email queueing for posts with shouldSendEmail: false", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id, {
      shouldSendEmail: false,
    });

    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(mailQueueStub.callCount, 0);
  });

  // shouldSendEmail controls email delivery only; subscribers must still see
  // the post in their "Artists you follow" feed via an in-app notification.
  // See #2071.
  it("still creates in-app notifications when shouldSendEmail: false", async () => {
    const { artist, subscriber } =
      await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id, {
      shouldSendEmail: false,
    });

    await sendPostNotification({ data: { postId: post.id } });

    const notification = await prisma.notification.findFirst({
      where: {
        postId: post.id,
        userId: subscriber.id,
        notificationType: "NEW_ARTIST_POST",
      },
    });
    assert.ok(notification, "in-app notification should be created");
    assert.strictEqual(notification?.deliveryMethod, "IN_APP");
  });

  it("marks shouldSendEmail: false posts as processed so the cron doesn't re-queue them", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id, {
      shouldSendEmail: false,
    });

    await sendPostNotification({ data: { postId: post.id } });

    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    assert.strictEqual(updated?.hasAnnounceEmailBeenSent, true);
  });

  it("skips posts with empty content", async () => {
    const { artist } = await createArtistWithSubscriber("sub@test.com");
    const post = await createPublishedPost(artist.id, { content: "   " });

    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(mailQueueStub.callCount, 0);
  });

  it("returns without error when post does not exist", async () => {
    await sendPostNotification({ data: { postId: 999999 } });
    assert.strictEqual(mailQueueStub.callCount, 0);
  });

  // ── Subscriber filtering ───────────────────────────────────────────────────

  it("does not email unconfirmed subscribers (emailConfirmationToken set)", async () => {
    const { artist } = await createArtistWithSubscriber(
      "unconfirmed@test.com",
      {
        emailConfirmationToken: UNCONFIRMED,
      }
    );
    const post = await createPublishedPost(artist.id);

    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(mailQueueStub.callCount, 0);
  });

  it("does not email deleted subscribers", async () => {
    const { artist } = await createArtistWithSubscriber("deleted@test.com", {
      deletedAt: new Date(),
    });
    const post = await createPublishedPost(artist.id);

    await sendPostNotification({ data: { postId: post.id } });

    assert.strictEqual(mailQueueStub.callCount, 0);
  });

  it("deduplicates subscribers who appear in multiple tiers", async () => {
    const { user: artistUser } = await createUser({
      email: "artist2@test.com",
      emailConfirmationToken: null,
    });
    const { user: subscriber } = await createUser({
      email: "multi@test.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Multi Tier Profile",
        urlSlug: "multi-tier-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: [{ name: "Tier A" }, { name: "Tier B" }],
        },
      },
      include: { subscriptionTiers: true },
    });

    // Subscribe the same user to both tiers
    for (const tier of artist.subscriptionTiers) {
      await prisma.profileUserSubscription.create({
        data: {
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 5,
        },
      });
    }

    const post = await createPublishedPost(artist.id);

    await sendPostNotification({ data: { postId: post.id } });

    // Despite two subscriptions, only one email should be queued
    assert.strictEqual(mailQueueStub.callCount, 1);
  });

  // ── Local mention notifications ────────────────────────────────────────────

  it("creates MENTION_IN_POST notification for a mentioned local artist", async () => {
    const { user: artistUser } = await createUser({
      email: "poster@test.com",
      emailConfirmationToken: null,
    });
    const { user: mentionedUser } = await createUser({
      email: "mentioned@test.com",
      emailConfirmationToken: null,
    });

    const postingArtist = await prisma.profile.create({
      data: {
        name: "Posting Profile",
        urlSlug: "posting-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    await prisma.profile.create({
      data: {
        name: "Mentioned Profile",
        urlSlug: "mentioned-artist",
        userId: mentionedUser.id,
        enabled: true,
      },
    });

    const post = await createPublishedPost(postingArtist.id, {
      content: `Hello <a href="/v1/artists/mentioned-artist" data-mention-actor="http://localhost/v1/ap/artists/mentioned-artist">@mentioned-artist</a>`,
    });

    await sendPostNotification({ data: { postId: post.id } });

    const mention = await prisma.notification.findFirst({
      where: {
        postId: post.id,
        userId: mentionedUser.id,
        notificationType: "MENTION_IN_POST",
      },
    });
    assert.ok(mention, "MENTION_IN_POST notification should be created");
    assert.strictEqual(mention?.deliveryMethod, "IN_APP");
  });
});
