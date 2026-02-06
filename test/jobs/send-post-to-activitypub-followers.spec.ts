import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";

import { clearTables, createArtist, createPost, createUser } from "../utils";
import sendPostToActivityPubFollowers from "../../src/jobs/send-post-to-activitypub-followers";
import prisma from "@mirlo/prisma";
import assert from "assert";

describe("send-post-to-activitypub-followers", () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    // Stub fetch for this test
    fetchStub = sinon.stub(global, "fetch" as any);
  });

  afterEach(() => {
    if (fetchStub) {
      fetchStub.restore();
    }
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

    // Create a published post that hasn't been sent
    const post = await createPost(artist.id, {
      title: "Test Post",
      content: "This is a test post",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
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

    // Mock fetch responses
    // First calls fetch the follower actor documents
    const follower1ActorResponse = {
      ok: true,
      json: async () => ({
        inbox: "https://mastodon.example/users/follower1/inbox",
      }),
    };

    const follower2ActorResponse = {
      ok: true,
      json: async () => ({
        inbox: "https://pixelfed.example/users/follower2/inbox",
      }),
    };

    // Inbox POST responses
    const inboxResponse = {
      ok: true,
      text: async () => "",
    };

    fetchStub
      .withArgs("https://mastodon.example/users/follower1")
      .resolves(follower1ActorResponse);
    fetchStub
      .withArgs("https://pixelfed.example/users/follower2")
      .resolves(follower2ActorResponse);
    fetchStub
      .withArgs("https://mastodon.example/users/follower1/inbox")
      .resolves(inboxResponse);
    fetchStub
      .withArgs("https://pixelfed.example/users/follower2/inbox")
      .resolves(inboxResponse);

    // Run the job
    await sendPostToActivityPubFollowers();

    // Verify post was marked as sent
    const updatedPost = await prisma.post.findFirst({
      where: { id: post.id },
    });

    assert.strictEqual(updatedPost?.hasBeenSentToActivityPub, true);

    // Verify fetch was called for actor documents
    assert(
      fetchStub.calledWith("https://mastodon.example/users/follower1"),
      "Should fetch follower1 actor"
    );
    assert(
      fetchStub.calledWith("https://pixelfed.example/users/follower2"),
      "Should fetch follower2 actor"
    );

    // Verify inbox POST calls were made
    assert(
      fetchStub.calledWith(
        "https://mastodon.example/users/follower1/inbox",
        sinon.match.object
      ),
      "Should POST to follower1 inbox"
    );
    assert(
      fetchStub.calledWith(
        "https://pixelfed.example/users/follower2/inbox",
        sinon.match.object
      ),
      "Should POST to follower2 inbox"
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

    const artist2 = await createArtist(artistUser.id, {
      name: "Test Artist 2",
      urlSlug: "test-artist-2",
      activityPub: true,
    });

    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist2.id,
        actor: "https://pixelfed.example/users/follower2",
      },
    });

    const post = await createPost(artist.id, {
      title: "Lonely Post",
      content: "This post has no followers",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    await sendPostToActivityPubFollowers();

    // Post should be marked as sent even with no followers
    const updatedPost = await prisma.post.findFirst({
      where: { id: post.id },
    });

    assert.strictEqual(updatedPost?.hasBeenSentToActivityPub, true);

    // No fetch calls should be made
    assert.strictEqual(fetchStub.callCount, 0);
  });

  it("should skip draft posts", async () => {
    const { user: artistUser } = await createUser({
      email: "artist3@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 3",
      urlSlug: "test-artist-3",
      activityPub: true,
    });

    // Create a draft post
    const draftPost = await createPost(artist.id, {
      title: "Draft Post",
      content: "This is a draft",
      isDraft: true,
      isPublic: true,
    });

    // Add a follower
    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://example.com/user",
      },
    });

    await sendPostToActivityPubFollowers();

    // Draft post should NOT be marked as sent
    const updatedPost = await prisma.post.findFirst({
      where: { id: draftPost.id },
    });

    assert.strictEqual(updatedPost?.hasBeenSentToActivityPub, false);
  });

  it("should skip posts already sent to ActivityPub", async () => {
    const { user: artistUser } = await createUser({
      email: "artist4@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 4",
      urlSlug: "test-artist-4",
      activityPub: true,
    });

    // Create a post that's already been sent
    const sentPost = await createPost(artist.id, {
      title: "Already Sent",
      content: "Already delivered",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    await prisma.post.update({
      where: { id: sentPost.id },
      data: { hasBeenSentToActivityPub: true },
    });

    await sendPostToActivityPubFollowers();

    // No fetch calls should be made
    assert.strictEqual(fetchStub.callCount, 0);
  });

  it("should handle follower inbox fetch errors gracefully", async () => {
    const { user: artistUser } = await createUser({
      email: "artist5@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test Artist 5",
      urlSlug: "test-artist-5",
      activityPub: true,
    });

    const post = await createPost(artist.id, {
      title: "Error Test",
      content: "Testing error handling",
      isDraft: false,
      isPublic: true,
      publishedAt: new Date(),
    });

    // Add a follower
    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://error.example/users/follower",
      },
    });

    // Mock fetch to fail when fetching actor
    fetchStub
      .withArgs("https://error.example/users/follower")
      .rejects(new Error("Network error"));

    await sendPostToActivityPubFollowers();

    // Post should still be marked as sent (we don't retry indefinitely)
    const updatedPost = await prisma.post.findFirst({
      where: { id: post.id },
    });

    assert.strictEqual(updatedPost?.hasBeenSentToActivityPub, true);
  });
});
