import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";

import { clearTables, createArtist, createPost, createUser } from "../utils";
import sendPostToActivityPubFollowers from "../../src/jobs/send-post-to-activitypub-followers";
import prisma from "@mirlo/prisma";
import assert from "assert";
import * as httpClientModule from "../../src/activityPub/httpClient";

describe("send-post-to-activitypub-followers", () => {
  let fetchActivityPubDocumentStub: sinon.SinonStub;
  let sendSignedActivityPubMessageStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    // Stub the httpClient functions
    fetchActivityPubDocumentStub = sinon.stub(
      httpClientModule,
      "fetchActivityPubDocument"
    );
    sendSignedActivityPubMessageStub = sinon.stub(
      httpClientModule,
      "sendSignedActivityPubMessage"
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should send posts to ActivityPub followers", async () => {
    // Create artist with ActivityPub enabled
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist",
      urlSlug: "test-artist",
      activityPub: true,
    });

    // Create a published post
    const post = await createPost(artist.id, {
      title: "Test Post",
      content: "This is a test post",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    // Create notifications for the post (simulating subscribers)
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

    // Add ActivityPub followers
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

    // Mock httpClient functions
    fetchActivityPubDocumentStub
      .withArgs("https://mastodon.example/users/follower1")
      .resolves({
        inbox: "https://mastodon.example/users/follower1/inbox",
      });

    fetchActivityPubDocumentStub
      .withArgs("https://pixelfed.example/users/follower2")
      .resolves({
        inbox: "https://pixelfed.example/users/follower2/inbox",
      });

    sendSignedActivityPubMessageStub.resolves();

    // Run the job
    await sendPostToActivityPubFollowers();

    // Verify notifications were marked as read
    const updatedNotif1 = await prisma.notification.findUnique({
      where: { id: notif1.id },
    });
    const updatedNotif2 = await prisma.notification.findUnique({
      where: { id: notif2.id },
    });

    assert.strictEqual(updatedNotif1?.isRead, true);
    assert.strictEqual(updatedNotif2?.isRead, true);

    // Verify httpClient functions were called for actor documents
    assert(
      fetchActivityPubDocumentStub.calledWith(
        "https://mastodon.example/users/follower1"
      ),
      "Should fetch follower1 actor"
    );
    assert(
      fetchActivityPubDocumentStub.calledWith(
        "https://pixelfed.example/users/follower2"
      ),
      "Should fetch follower2 actor"
    );

    // Verify sendSignedActivityPubMessage was called for both followers
    assert.strictEqual(
      sendSignedActivityPubMessageStub.callCount,
      2,
      "Should send to 2 followers"
    );

    assert(
      sendSignedActivityPubMessageStub.calledWith(
        "https://mastodon.example/users/follower1/inbox",
        sinon.match.object,
        sinon.match.object
      ),
      "Should send to follower1 inbox"
    );

    assert(
      sendSignedActivityPubMessageStub.calledWith(
        "https://pixelfed.example/users/follower2/inbox",
        sinon.match.object,
        sinon.match.object
      ),
      "Should send to follower2 inbox"
    );
  });

  it("should not send posts if artist has no followers", async () => {
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

    // Notification should be marked as read even with no followers
    const updatedNotif = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    assert.strictEqual(updatedNotif?.isRead, true);

    // No fetch calls should be made
    assert.strictEqual(fetchActivityPubDocumentStub.callCount, 0);
  });

  it("should skip notifications with deliveryMethod EMAIL only", async () => {
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

    await prisma.notification.create({
      data: {
        postId: post.id,
        userId: subscriber.user.id,
        notificationType: "NEW_ARTIST_POST",
        deliveryMethod: "EMAIL", // Not ACTIVITYPUB or BOTH
        isRead: false,
      },
    });

    // Add a follower
    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://example.com/user",
      },
    });

    await sendPostToActivityPubFollowers();

    // No fetch calls should be made since no ACTIVITYPUB notifications exist
    assert.strictEqual(fetchActivityPubDocumentStub.callCount, 0);
  });

  it("should pass activity pub disabled artists", async () => {
    const { user: artistUser } = await createUser({
      email: "artist4@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 4",
      urlSlug: "test-artist-4",
      activityPub: false, // ActivityPub disabled
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

    // Add a follower (won't be used)
    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://example.com/user",
      },
    });

    await sendPostToActivityPubFollowers();

    // Notification should be marked as read even if artist has AP disabled
    const updatedNotif = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    assert.strictEqual(updatedNotif?.isRead, true);

    // No fetch calls should be made
    assert.strictEqual(fetchActivityPubDocumentStub.callCount, 0);
  });

  it("should skip already read notifications", async () => {
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
        isRead: true, // Already read
      },
    });

    await sendPostToActivityPubFollowers();

    // No fetch calls should be made
    assert.strictEqual(fetchActivityPubDocumentStub.callCount, 0);
  });

  it("should handle follower inbox fetch errors gracefully", async () => {
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

    // Add a follower
    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://error.example/users/follower",
      },
    });

    // Mock fetchActivityPubDocument to fail when fetching actor
    fetchActivityPubDocumentStub
      .withArgs("https://error.example/users/follower")
      .rejects(new Error("Network error"));

    await sendPostToActivityPubFollowers();

    // Notification should still be marked as read (we don't retry indefinitely)
    const updatedNotif = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    assert.strictEqual(updatedNotif?.isRead, true);
  });
});
