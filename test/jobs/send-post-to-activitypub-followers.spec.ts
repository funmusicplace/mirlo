import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import sinon from "sinon";

import { federation } from "../../src/activityPub/federation";
import { parseMentionsFromContent } from "../../src/activityPub/utils";
import sendPostToActivityPubFollowers from "../../src/jobs/send-post-to-activitypub-followers";
import { clearTables, createArtist, createPost, createUser } from "../utils";

describe("send-post-to-activitypub-followers", () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    // Reject all network calls by default so fedify delivery fails fast
    fetchStub = sinon
      .stub(global, "fetch" as any)
      .rejects(new Error("Network disabled in tests"));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it("should mark notifications as read after sending to followers", async () => {
    const { user: artistUser } = await createUser({ email: "artist@test.com" });

    const artist = await createArtist(artistUser.id, {
      name: "Test Profile",
      urlSlug: "test-artist",
      activityPub: true,
    });

    const post = await createPost(artist.id, {
      title: "Test Post",
      content: "This is a test post",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    const subscriber1 = await createUser({ email: "sub1@test.com" });
    const subscriber2 = await createUser({ email: "sub2@test.com" });

    const notif1 = await prisma.notification.create({
      data: {
        postId: post.id,
        userId: subscriber1.user.id,
        notificationType: "NEW_ARTIST_POST",
        deliveryMethod: "BOTH",
        isRead: false,
      },
    });

    const notif2 = await prisma.notification.create({
      data: {
        postId: post.id,
        userId: subscriber2.user.id,
        notificationType: "NEW_ARTIST_POST",
        deliveryMethod: "BOTH",
        isRead: false,
      },
    });

    await prisma.activityPubProfileFollowers.create({
      data: {
        profileId: artist.id,
        actor: "https://mastodon.example/users/follower1",
      },
    });

    await prisma.activityPubProfileFollowers.create({
      data: {
        profileId: artist.id,
        actor: "https://pixelfed.example/users/follower2",
      },
    });

    await sendPostToActivityPubFollowers();

    const updatedNotif1 = await prisma.notification.findUnique({
      where: { id: notif1.id },
    });
    const updatedNotif2 = await prisma.notification.findUnique({
      where: { id: notif2.id },
    });

    assert.strictEqual(updatedNotif1?.isRead, true);
    assert.strictEqual(updatedNotif2?.isRead, true);
  });

  it("should not process notifications with deliveryMethod EMAIL only", async () => {
    const { user: artistUser } = await createUser({
      email: "artist3@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Profile 3",
      urlSlug: "test-artist-3",
      activityPub: true,
    });

    const post = await createPost(artist.id, {
      title: "Email Only Post",
      content: "This notification is email only",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    const subscriber = await createUser({ email: "sub@test.com" });

    const notification = await prisma.notification.create({
      data: {
        postId: post.id,
        userId: subscriber.user.id,
        notificationType: "NEW_ARTIST_POST",
        deliveryMethod: "EMAIL",
        isRead: false,
      },
    });

    await prisma.activityPubProfileFollowers.create({
      data: {
        profileId: artist.id,
        actor: "https://example.com/user",
      },
    });

    await sendPostToActivityPubFollowers();

    // Notification was EMAIL only, job should not have touched it
    const updatedNotif = await prisma.notification.findUnique({
      where: { id: notification.id },
    });
    assert.strictEqual(updatedNotif?.isRead, false);
  });

  it("should not process posts for artists with ActivityPub disabled", async () => {
    const { user: artistUser } = await createUser({
      email: "artist4@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Profile 4",
      urlSlug: "test-artist-4",
      activityPub: false,
    });

    const post = await createPost(artist.id, {
      title: "No ActivityPub",
      content: "Profile has AP disabled",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    await sendPostToActivityPubFollowers();

    // Job should not have attempted any delivery
    assert.strictEqual(fetchStub.callCount, 0);

    // Post should not be marked as sent (it was never eligible)
    const updatedPost = await prisma.post.findUnique({
      where: { id: post.id },
    });
    assert.strictEqual(updatedPost?.hasActivityPubBeenSent, false);
  });

  it("should not re-process posts already marked as sent", async () => {
    const { user: artistUser } = await createUser({
      email: "artist5@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Profile 5",
      urlSlug: "test-artist-5",
      activityPub: true,
    });

    await createPost(artist.id, {
      title: "Already Sent",
      content: "This post was already sent via ActivityPub",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
      hasActivityPubBeenSent: true,
    });

    await prisma.activityPubProfileFollowers.create({
      data: {
        profileId: artist.id,
        actor: "https://mastodon.example/users/follower",
      },
    });

    await sendPostToActivityPubFollowers();

    // Job should not have made any fetch calls (post already sent)
    assert.strictEqual(fetchStub.callCount, 0);
  });

  it("should mark notification as read even if delivery fails", async () => {
    const { user: artistUser } = await createUser({
      email: "artist6@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Profile 6",
      urlSlug: "test-artist-6",
      activityPub: true,
    });

    const post = await createPost(artist.id, {
      title: "Error Test",
      content: "Testing error handling",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    const subscriber = await createUser({ email: "sub@test.com" });

    const notification = await prisma.notification.create({
      data: {
        postId: post.id,
        userId: subscriber.user.id,
        notificationType: "NEW_ARTIST_POST",
        deliveryMethod: "BOTH",
        isRead: false,
      },
    });

    await prisma.activityPubProfileFollowers.create({
      data: {
        profileId: artist.id,
        actor: "https://error.example/users/follower",
        inboxUrl: "https://error.example/users/follower/inbox",
      },
    });

    // Stub sendActivity on the context directly so Fedify's retry machinery
    // never runs. fetchStub already rejects the inbox POST, but going through
    // InProcessMessageQueue would accumulate pending retries across tests and
    // push this (the last test in the suite) past Mocha's 2000ms limit.
    const origCreateContext = federation.createContext.bind(federation);
    const createContextStub = sinon
      .stub(federation as any, "createContext")
      .callsFake(async (...args: any[]) => {
        const ctx = await (origCreateContext as any)(...args);
        sinon
          .stub(ctx as any, "sendActivity")
          .rejects(new Error("delivery failed"));
        return ctx;
      });

    try {
      await sendPostToActivityPubFollowers();
    } finally {
      createContextStub.restore();
    }

    const updatedNotif = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    assert.strictEqual(updatedNotif?.isRead, true);
  });

  describe("parseMentionsFromContent", () => {
    it("should parse single mention from HTML content", () => {
      const content =
        'Check this out: <a href="https://mastodon.example/users/alice" data-mention-actor="https://mastodon.example/users/alice">@alice</a>';
      const mentions = parseMentionsFromContent(content);

      assert.strictEqual(mentions.length, 1);
      assert.strictEqual(
        mentions[0].href,
        "https://mastodon.example/users/alice"
      );
      assert.strictEqual(mentions[0].name, "@alice");
    });

    it("should parse multiple mentions from HTML content", () => {
      const content =
        '<a data-mention-actor="https://mastodon.example/users/alice">@alice</a> and <a data-mention-actor="https://pixelfed.example/users/bob" href="#">@bob</a>';
      const mentions = parseMentionsFromContent(content);

      assert.strictEqual(mentions.length, 2);
      assert.strictEqual(
        mentions[0].href,
        "https://mastodon.example/users/alice"
      );
      assert.strictEqual(mentions[0].name, "@alice");
      assert.strictEqual(
        mentions[1].href,
        "https://pixelfed.example/users/bob"
      );
      assert.strictEqual(mentions[1].name, "@bob");
    });

    it("should handle mentions with complex display names", () => {
      const content =
        '<a data-mention-actor="https://example.com/users/alice">alice@example.com</a>';
      const mentions = parseMentionsFromContent(content);

      assert.strictEqual(mentions.length, 1);
      assert.strictEqual(mentions[0].href, "https://example.com/users/alice");
      assert.strictEqual(mentions[0].name, "alice@example.com");
    });

    it("should ignore mentions without data-mention-actor attribute", () => {
      const content =
        '<a href="https://example.com">regular link</a> and <a data-mention-actor="https://mastodon.example/users/alice">@alice</a>';
      const mentions = parseMentionsFromContent(content);

      assert.strictEqual(mentions.length, 1);
      assert.strictEqual(mentions[0].name, "@alice");
    });

    it("should handle mentions with inner HTML tags", () => {
      const content =
        '<a data-mention-actor="https://mastodon.example/users/alice"><span class="mention">@alice</span></a>';
      const mentions = parseMentionsFromContent(content);

      assert.strictEqual(mentions.length, 1);
      assert.strictEqual(mentions[0].name, "@alice");
    });

    it("should return empty array for content with no mentions", () => {
      const content = "This is plain text with no mentions at all";
      const mentions = parseMentionsFromContent(content);

      assert.strictEqual(mentions.length, 0);
    });

    it("should return empty array for empty content", () => {
      const mentions = parseMentionsFromContent("");
      assert.strictEqual(mentions.length, 0);
    });

    it("should handle case-insensitive matching", () => {
      const content =
        '<A data-mention-actor="https://mastodon.example/users/alice">@alice</A>';
      const mentions = parseMentionsFromContent(content);

      assert.strictEqual(mentions.length, 1);
      assert.strictEqual(mentions[0].name, "@alice");
    });
  });

  describe("post activity with mentions", () => {
    it("should attempt to deliver to mentioned actors not already in followers", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-mention@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test Profile",
        urlSlug: "test-artist-mention",
        activityPub: true,
      });

      const mentionedActorUrl = "https://mastodon.example/users/mentioned";
      const mentionedInboxUrl =
        "https://mastodon.example/users/mentioned/inbox";

      const post = await createPost(artist.id, {
        title: "Post with Mention",
        content: `Check this out: <a href="${mentionedActorUrl}" data-mention-actor="${mentionedActorUrl}">@mentioned</a>`,
        isDraft: false,
        isPublic: true,
        publishedAt: new Date(),
      });

      const subscriber = await createUser({ email: "sub-mention@test.com" });

      const notification = await prisma.notification.create({
        data: {
          postId: post.id,
          userId: subscriber.user.id,
          notificationType: "NEW_ARTIST_POST",
          deliveryMethod: "BOTH",
          isRead: false,
        },
      });

      // Add a follower (different from the mentioned actor) so the post isn't skipped
      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: artist.id,
          actor: "https://other.example/users/follower",
        },
      });

      // Allow the actor document fetch to succeed, returning an inbox URL
      fetchStub.withArgs(mentionedActorUrl, sinon.match.any).resolves({
        ok: true,
        json: async () => ({ inbox: mentionedInboxUrl }),
      });
      // Allow the inbox POST to complete so fedify's sendActivity resolves
      fetchStub.withArgs(mentionedInboxUrl, sinon.match.any).resolves({
        ok: true,
        status: 202,
        text: async () => "",
        headers: new Headers(),
      });

      await sendPostToActivityPubFollowers();

      const updatedNotif = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      assert.strictEqual(updatedNotif?.isRead, true);

      // The actor document was fetched to resolve the inbox URL
      assert(
        fetchStub.calledWith(mentionedActorUrl, sinon.match.any),
        "Should fetch the mentioned actor document to resolve their inbox"
      );
    });

    it("should mark notification as read even when mention delivery fails", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-err@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test Profile",
        urlSlug: "test-artist-err",
        activityPub: true,
      });

      const mentionedActorUrl = "https://error.example/users/mentioned";

      const post = await createPost(artist.id, {
        title: "Post with Broken Mention",
        content: `Hello <a href="${mentionedActorUrl}" data-mention-actor="${mentionedActorUrl}">@mentioned</a>`,
        isDraft: false,
        isPublic: true,
        publishedAt: new Date(),
      });

      const subscriber = await createUser({ email: "sub-err@test.com" });

      const notification = await prisma.notification.create({
        data: {
          postId: post.id,
          userId: subscriber.user.id,
          notificationType: "NEW_ARTIST_POST",
          deliveryMethod: "BOTH",
          isRead: false,
        },
      });

      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: artist.id,
          actor: "https://other.example/users/follower",
          inboxUrl: "https://other.example/users/follower/inbox",
        },
      });

      // Stub sendActivity directly — same reason as the follower error test above.
      const origCreateContext = federation.createContext.bind(federation);
      const createContextStub = sinon
        .stub(federation as any, "createContext")
        .callsFake(async (...args: any[]) => {
          const ctx = await (origCreateContext as any)(...args);
          sinon
            .stub(ctx as any, "sendActivity")
            .rejects(new Error("delivery failed"));
          return ctx;
        });

      try {
        await sendPostToActivityPubFollowers();
      } finally {
        createContextStub.restore();
      }

      const updatedNotif = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      assert.strictEqual(updatedNotif?.isRead, true);
    });

    it("should deliver to mentioned actors even when artist has no followers", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-mention-only@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test Profile",
        urlSlug: "test-artist-mention-only",
        activityPub: true,
      });

      const mentionedActorUrl = "https://mastodon.example/users/mentioned-only";
      const mentionedInboxUrl =
        "https://mastodon.example/users/mentioned-only/inbox";

      const post = await createPost(artist.id, {
        title: "Post with Mention and No Followers",
        content: `Check this out: <a href="${mentionedActorUrl}" data-mention-actor="${mentionedActorUrl}">@mentioned-only</a>`,
        isDraft: false,
        isPublic: true,
        publishedAt: new Date(),
      });

      const subscriber = await createUser({
        email: "sub-mention-only@test.com",
      });

      const notification = await prisma.notification.create({
        data: {
          postId: post.id,
          userId: subscriber.user.id,
          notificationType: "NEW_ARTIST_POST",
          deliveryMethod: "BOTH",
          isRead: false,
        },
      });

      // No followers added — artist has zero followers

      fetchStub.withArgs(mentionedActorUrl, sinon.match.any).resolves({
        ok: true,
        json: async () => ({ inbox: mentionedInboxUrl }),
      });

      await sendPostToActivityPubFollowers();

      const updatedNotif = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      assert.strictEqual(updatedNotif?.isRead, true);

      assert(
        fetchStub.calledWith(mentionedActorUrl, sinon.match.any),
        "Should fetch the mentioned actor document even when there are no followers"
      );
    });
  });
});
