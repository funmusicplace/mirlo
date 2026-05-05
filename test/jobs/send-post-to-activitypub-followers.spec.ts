import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import sinon from "sinon";

import sendPostToActivityPubFollowers, {
  parseMentionsFromContent,
} from "../../src/jobs/send-post-to-activitypub-followers";
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
      name: "Test Artist",
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

    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://mastodon.example/users/follower1",
      },
    });

    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
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

  it("should mark notification as read even if artist has no followers", async () => {
    const { user: artistUser } = await createUser({
      email: "artist2@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist",
      urlSlug: "test-artist",
      activityPub: true,
    });

    const post = await createPost(artist.id, {
      title: "Lonely Post",
      content: "This post has no followers",
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

    await sendPostToActivityPubFollowers();

    const updatedNotif = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    assert.strictEqual(updatedNotif?.isRead, true);
  });

  it("should not process notifications with deliveryMethod EMAIL only", async () => {
    const { user: artistUser } = await createUser({
      email: "artist3@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 3",
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

    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
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

  it("should mark notification as read even when ActivityPub is disabled for artist", async () => {
    const { user: artistUser } = await createUser({
      email: "artist4@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 4",
      urlSlug: "test-artist-4",
      activityPub: false,
    });

    const post = await createPost(artist.id, {
      title: "No ActivityPub",
      content: "Artist has AP disabled",
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

    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://example.com/user",
      },
    });

    await sendPostToActivityPubFollowers();

    const updatedNotif = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    assert.strictEqual(updatedNotif?.isRead, true);
  });

  it("should not process already read notifications", async () => {
    const { user: artistUser } = await createUser({
      email: "artist5@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 5",
      urlSlug: "test-artist-5",
      activityPub: true,
    });

    const post = await createPost(artist.id, {
      title: "Already Read",
      content: "This notification is already read",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    const subscriber = await createUser({ email: "sub@test.com" });

    await prisma.notification.create({
      data: {
        postId: post.id,
        userId: subscriber.user.id,
        notificationType: "NEW_ARTIST_POST",
        deliveryMethod: "BOTH",
        isRead: true,
      },
    });

    await sendPostToActivityPubFollowers();

    // Job should not have made any fetch calls (notification already read, skipped)
    assert.strictEqual(fetchStub.callCount, 0);
  });

  it("should mark notification as read even if delivery fails", async () => {
    const { user: artistUser } = await createUser({
      email: "artist6@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 6",
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

    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://error.example/users/follower",
      },
    });

    // fetchStub already rejects by default — fedify delivery will fail

    await sendPostToActivityPubFollowers();

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
        name: "Test Artist",
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
      await prisma.activityPubArtistFollowers.create({
        data: {
          artistId: artist.id,
          actor: "https://other.example/users/follower",
        },
      });

      // Allow the actor document fetch to succeed, returning an inbox URL
      fetchStub.withArgs(mentionedActorUrl, sinon.match.any).resolves({
        ok: true,
        json: async () => ({ inbox: mentionedInboxUrl }),
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

    it("should not fetch actor document for mentions that are already followers", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-dup@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test Artist",
        urlSlug: "test-artist-dup",
        activityPub: true,
      });

      const followerActorUrl = "https://mastodon.example/users/follower";

      const post = await createPost(artist.id, {
        title: "Post with Duplicate Mention",
        content: `Mentioning: <a href="${followerActorUrl}" data-mention-actor="${followerActorUrl}">@follower</a>`,
        isDraft: false,
        isPublic: true,
        publishedAt: new Date(),
      });

      const subscriber = await createUser({ email: "sub-dup@test.com" });

      await prisma.notification.create({
        data: {
          postId: post.id,
          userId: subscriber.user.id,
          notificationType: "NEW_ARTIST_POST",
          deliveryMethod: "BOTH",
          isRead: false,
        },
      });

      // The mentioned actor is also a follower
      await prisma.activityPubArtistFollowers.create({
        data: {
          artistId: artist.id,
          actor: followerActorUrl,
        },
      });

      await sendPostToActivityPubFollowers();

      // The follower's actor document should NOT have been fetched
      // (they receive via the followers fanout, not individual mention delivery)
      assert(
        !fetchStub.calledWith(followerActorUrl, sinon.match.any),
        "Should not fetch actor document for a follower who is also mentioned"
      );
    });

    it("should mark notification as read even when mention delivery fails", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-err@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test Artist",
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

      await prisma.activityPubArtistFollowers.create({
        data: {
          artistId: artist.id,
          actor: "https://other.example/users/follower",
        },
      });

      // fetchStub rejects by default — mention actor fetch will fail

      await sendPostToActivityPubFollowers();

      const updatedNotif = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      assert.strictEqual(updatedNotif?.isRead, true);
    });
  });
});
