import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createPost,
  createTrackGroup,
  createUser,
} from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import sendNotificationEmail, {
  parseOutIframes,
} from "../../src/jobs/send-notification-email";
import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../src/queues/send-mail-queue";

describe("send-notification-email", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    // Gotta make sure to close the queues and queue events
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  it("should send email based on NEW_ARTIST_POST notification", async () => {
    // const stub = sinon.stub(sendMail, "default");
    const stub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const followerEmail = "follower+subscription@follower.com";

    const { user: followerUser } = await createUser({
      email: followerEmail,
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const post = await createPost(artist.id, {
      title: "Our Custom Title",
      content: "# HI",
    });

    await prisma.notification.create({
      data: {
        userId: followerUser.id,
        postId: post.id,
        isRead: false,
        notificationType: "NEW_ARTIST_POST",
      },
    });

    await sendNotificationEmail();

    assert.equal(stub.calledOnce, true);
    const args = stub.getCall(0).args;
    assert.equal(args[0], "send-mail");
    const data = args[1];
    assert.equal(data.template, "announce-post-published");
    assert.equal(data.message.to, followerEmail);
    assert.equal(data.locals.artist.id, artist.id);
    assert.equal(data.locals.post.id, post.id);
    assert.equal(data.locals.email, encodeURIComponent(followerEmail));
  });

  it("should not send email if post is marked as not shouldSendEmail", async () => {
    const stub = sinon.stub(sendMailQueue, "add");

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
      },
    });

    const post = await createPost(artist.id, {
      title: "Our Custom Title",
      content: "# HI",
      shouldSendEmail: false,
    });

    await prisma.notification.create({
      data: {
        userId: followerUser.id,
        postId: post.id,
        isRead: false,
        notificationType: "NEW_ARTIST_POST",
      },
    });

    await sendNotificationEmail();

    assert.equal(stub.called, false);
  });

  it("should not send email if post content is blank", async () => {
    const stub = sinon.stub(sendMailQueue, "add");

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
      },
    });

    const post = await createPost(artist.id, {
      title: "Our Custom Title",
      content: "",
      shouldSendEmail: false,
    });

    await prisma.notification.create({
      data: {
        userId: followerUser.id,
        postId: post.id,
        isRead: false,
        notificationType: "NEW_ARTIST_POST",
      },
    });

    await sendNotificationEmail();

    assert.equal(stub.called, false);
  });

  describe("parseOutIframes", () => {
    it("should replace iframe with trackGroup", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const content = `<iframe src="https://mirlo.space/widget/trackGroup/${trackGroup.id}"></iframe>`;
      const result = await parseOutIframes(content);
      console.log("result", result);
      assert(
        result.includes(
          `<div data-type="trackGroup" data-id="${trackGroup.id}"`
        )
      );
    });

    it("should replace iframe with track", async () => {
      const content = `<iframe src="https://mirlo.space/widget/track/67890"></iframe>`;
      const result = await parseOutIframes(content);
      console.log("result", result);
      assert(result.includes('<div data-type="track" data-id="67890">'));
    });

    it("should not modify content without iframes", async () => {
      const content = `<p>No iframes here!</p>`;
      const result = await parseOutIframes(content);
      assert.equal(result, content);
    });
  });
});
