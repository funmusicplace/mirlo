import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createPost, createUser } from "../utils";

import prisma from "../../prisma/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import sendNotificationEmail from "../../src/jobs/send-notification-email";

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

  it("should send email based on NEW_ARTIST_POST notification", async () => {
    const stub = sinon.stub(sendMail, "default");

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
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-post-published");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.artist.id, artist.id);
    assert.equal(data0.locals.post.id, post.id);
    assert.equal(data0.locals.email, followerUser.email);
  });

  it("should not send email if post is marked as not shouldSendEmail", async () => {
    const stub = sinon.stub(sendMail, "default");

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
});
