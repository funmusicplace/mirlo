import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { Article, Audio, Create } from "@fedify/fedify/vocab";
import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import sinon from "sinon";

import { federation } from "../../src/activityPub/federation";
import sendPostNotification from "../../src/jobs/send-post-notification";
import { sendMailQueue } from "../../src/queues/send-mail-queue";
import { notifyFollowersOfNewAlbum } from "../../src/utils/trackGroup";
import {
  clearTables,
  createArtist,
  createPost,
  createSubscription,
  createTier,
  createTrackGroup,
  createUser,
} from "../utils";

describe("sending to ActivityPub followers", () => {
  let sendActivityStub: sinon.SinonStub;
  let createContextStub: sinon.SinonStub;
  let fetchStub: sinon.SinonStub;
  let mailQueueStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    sendActivityStub = sinon.stub().resolves();
    const origCreateContext = federation.createContext.bind(federation);
    createContextStub = sinon
      .stub(federation as any, "createContext")
      .callsFake((...args: any[]) => {
        const ctx = (origCreateContext as any)(...args);
        ctx.sendActivity = sendActivityStub;
        return ctx;
      });
    fetchStub = sinon
      .stub(global, "fetch" as any)
      .rejects(new Error("Network disabled in tests"));
    mailQueueStub = sinon.stub(sendMailQueue, "add").resolves({} as any);
  });

  afterEach(() => {
    createContextStub.restore();
    fetchStub.restore();
    mailQueueStub.restore();
  });

  const createAPArtist = async (activityPub = true) => {
    const { user } = await createUser({ email: "artist@test.com" });
    return createArtist(user.id, {
      name: "Test Artist",
      urlSlug: "test-artist",
      activityPub,
    });
  };

  describe("releases", () => {
    it("should send a release to followers once when followers are notified", async () => {
      const artist = await createAPArtist();
      const trackGroup = await createTrackGroup(artist.id, {
        title: "New Album",
      });

      await notifyFollowersOfNewAlbum(trackGroup);

      assert.strictEqual(sendActivityStub.callCount, 1);
      const [sender, recipients, activity] = sendActivityStub.firstCall.args;
      assert.deepStrictEqual(sender, { identifier: "test-artist" });
      assert.strictEqual(recipients, "followers");
      assert(activity instanceof Create);
      assert(
        activity.id?.href.endsWith(`/activities/release-${trackGroup.id}`)
      );
      const object = await activity.getObject();
      assert(object instanceof Audio);
      assert.strictEqual(object.name?.toString(), "New Album");
      assert(object.id?.href.endsWith(`/releases/${trackGroup.id}`));

      const notified = await prisma.trackGroup.findUniqueOrThrow({
        where: { id: trackGroup.id },
      });
      await notifyFollowersOfNewAlbum(notified);

      assert.strictEqual(sendActivityStub.callCount, 1);
    });

    it("should not send releases for artists with ActivityPub disabled", async () => {
      const artist = await createAPArtist(false);
      const trackGroup = await createTrackGroup(artist.id);

      await notifyFollowersOfNewAlbum(trackGroup);

      assert.strictEqual(sendActivityStub.callCount, 0);
    });

    it("should still mark followers as notified if delivery fails", async () => {
      const artist = await createAPArtist();
      const trackGroup = await createTrackGroup(artist.id);
      sendActivityStub.rejects(new Error("delivery failed"));

      await notifyFollowersOfNewAlbum(trackGroup);

      const updated = await prisma.trackGroup.findUniqueOrThrow({
        where: { id: trackGroup.id },
      });
      assert.notStrictEqual(updated.notifiedFollowersAt, null);
    });
  });

  describe("posts", () => {
    const publishPost = async (
      profileId: number,
      data: Parameters<typeof createPost>[1] = {}
    ) => {
      const post = await createPost(profileId, {
        title: "Test Post",
        isDraft: false,
        shouldSendEmail: false,
        ...data,
      });
      await sendPostNotification({ data: { postId: post.id } });
      return post;
    };

    it("should send a published post to followers and mark ActivityPub notifications read", async () => {
      const artist = await createAPArtist();
      const tier = await createTier(artist.id);
      const { user: subscriber } = await createUser({
        email: "sub@test.com",
        emailConfirmationToken: null,
      });
      await createSubscription(subscriber.id, tier.id);

      const post = await publishPost(artist.id);

      assert.strictEqual(sendActivityStub.callCount, 1);
      const [sender, recipients, activity] = sendActivityStub.firstCall.args;
      assert.deepStrictEqual(sender, { identifier: "test-artist" });
      assert.strictEqual(recipients, "followers");
      assert(activity instanceof Create);
      assert(activity.id?.href.endsWith(`/activities/post-${post.id}`));
      assert((await activity.getObject()) instanceof Article);

      const notification = await prisma.notification.findFirstOrThrow({
        where: { postId: post.id, userId: subscriber.id },
      });
      assert.strictEqual(notification.deliveryMethod, "ACTIVITYPUB");
      assert.strictEqual(notification.isRead, true);
    });

    it("should not send supporter-only posts", async () => {
      const artist = await createAPArtist();
      const tier = await createTier(artist.id);
      const { user: subscriber } = await createUser({
        email: "sub@test.com",
        emailConfirmationToken: null,
      });
      await createSubscription(subscriber.id, tier.id);

      const post = await publishPost(artist.id, { isPublic: false });

      assert.strictEqual(sendActivityStub.callCount, 0);
      const notification = await prisma.notification.findFirstOrThrow({
        where: { postId: post.id, userId: subscriber.id },
      });
      assert.strictEqual(notification.isRead, false);
    });

    it("should not send posts for artists with ActivityPub disabled", async () => {
      const artist = await createAPArtist(false);

      await publishPost(artist.id);

      assert.strictEqual(sendActivityStub.callCount, 0);
    });

    it("should deliver to mentioned actors who aren't followers with a known inbox", async () => {
      const artist = await createAPArtist();
      const mentionedActor = "https://mastodon.example/users/mentioned";
      const mentionedInbox = "https://mastodon.example/users/mentioned/inbox";
      const followerActor = "https://mastodon.example/users/follower";
      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: artist.id,
          actor: followerActor,
          inboxUrl: `${followerActor}/inbox`,
        },
      });
      fetchStub.withArgs(mentionedActor, sinon.match.any).resolves({
        ok: true,
        json: async () => ({ inbox: mentionedInbox }),
      });

      await publishPost(artist.id, {
        content: [mentionedActor, followerActor]
          .map((a) => `<a href="${a}" data-mention-actor="${a}">@x</a>`)
          .join(" "),
      });

      assert.strictEqual(sendActivityStub.callCount, 2);
      const [, recipient] = sendActivityStub.secondCall.args;
      assert.strictEqual(recipient.id.href, mentionedActor);
      assert.strictEqual(recipient.inboxId.href, mentionedInbox);
      assert(!fetchStub.calledWith(followerActor, sinon.match.any));
    });

    it("should still finish the notification job if delivery fails", async () => {
      const artist = await createAPArtist();
      sendActivityStub.rejects(new Error("delivery failed"));

      const post = await publishPost(artist.id);

      const updated = await prisma.post.findUniqueOrThrow({
        where: { id: post.id },
      });
      assert.strictEqual(updated.hasAnnounceEmailBeenSent, true);
    });
  });
});
