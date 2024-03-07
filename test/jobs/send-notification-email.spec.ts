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

  afterEach(() => {});

  it("should add post to notifications", async () => {
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
    assert.equal(
      stub.getCall(0).args[0].data.template,
      "announce-post-published"
    );
    assert.equal(
      stub.getCall(0).args[0].data.message.to,
      "follower@follower.com"
    );
    assert.equal(stub.getCall(0).args[0].data.locals.artist.id, artist.id);
    assert.equal(stub.getCall(0).args[0].data.locals.post.id, post.id);
  });
});
