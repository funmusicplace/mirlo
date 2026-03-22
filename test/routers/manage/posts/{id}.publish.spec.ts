import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, afterEach } from "mocha";
import sinon from "sinon";
import {
  clearTables,
  createArtist,
  createPost,
  createUser,
} from "../../../utils";

import { requestApp } from "../../utils";
import prisma from "@mirlo/prisma";
import {
  sendPostNotificationQueue,
  sendPostNotificationQueueEvents,
} from "../../../../src/queues/send-post-notification-queue";

describe("manage/posts/{id}/publish", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }

    // Clear any existing jobs before the test
    const jobsBefore = await sendPostNotificationQueue.getJobs([
      "delayed",
      "waiting",
    ]);
    for (const job of jobsBefore) {
      await job.remove();
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    // Gotta make sure to close the queues and queue events
    await sendPostNotificationQueue.close();
    await sendPostNotificationQueueEvents.close();
  });

  describe("/", () => {
    it("should PUT to publish a post", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);
      assert.equal(post.isDraft, true);

      await requestApp
        .put(`manage/posts/${post.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .send({})
        .set("Accept", "application/json");

      const updatedPost = await prisma.post.findFirst({
        where: { id: post.id },
      });
      assert.equal(updatedPost?.isDraft, false);
    });

    it("should remove pending notification job when reverting a post to draft", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      // Create post as published
      const post = await createPost(artist.id, { isDraft: false });
      assert.equal(post.isDraft, false);

      // Manually add a pending notification job to the queue (simulating a previously published post)
      const addedJob = await sendPostNotificationQueue.add(
        "send-post-notification",
        { postId: post.id },
        { delay: 10 * 60 * 1000 }
      );
      assert.ok(addedJob, "job should be added to queue");

      // Verify the job exists before reverting
      let jobsBefore = await sendPostNotificationQueue.getJobs([
        "delayed",
        "waiting",
      ]);
      const jobForPostBefore = jobsBefore.find(
        (j) => j.data.postId === post.id
      );
      assert.ok(
        jobForPostBefore,
        "job should exist for this post before reverting"
      );

      // Revert post back to draft
      await requestApp
        .put(`manage/posts/${post.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .send({})
        .set("Accept", "application/json");

      // Give the queue a moment to process the job removal
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify the job was removed
      const jobsAfter = await sendPostNotificationQueue.getJobs([
        "delayed",
        "waiting",
      ]);
      const jobForPostAfter = jobsAfter.find((j) => j.data.postId === post.id);
      assert.ok(
        !jobForPostAfter,
        "job should be removed after reverting to draft"
      );
    });

    it("should NOT queue a job when publishing a post with shouldSendEmail set to false", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, { shouldSendEmail: false });
      assert.equal(post.isDraft, true);
      assert.equal(post.shouldSendEmail, false);

      await requestApp
        .put(`manage/posts/${post.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .send({})
        .set("Accept", "application/json");

      // Give the queue a moment (if it were to process)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify NO jobs were queued for this post
      const queuedJobs = await sendPostNotificationQueue.getJobs([
        "delayed",
        "waiting",
      ]);
      const jobForPost = queuedJobs.find((j) => j.data.postId === post.id);
      assert.ok(
        !jobForPost,
        "no job should be queued when shouldSendEmail is false"
      );
    });

    it("should NOT queue a job when publishing a post with blank content", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, { content: "" });
      assert.equal(post.isDraft, true);
      assert.equal(post.content, "");

      await requestApp
        .put(`manage/posts/${post.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .send({})
        .set("Accept", "application/json");

      // Give the queue a moment (if it were to process)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify NO jobs were queued for this post
      const queuedJobs = await sendPostNotificationQueue.getJobs([
        "delayed",
        "waiting",
      ]);
      const jobForPost = queuedJobs.find((j) => j.data.postId === post.id);
      assert.ok(!jobForPost, "no job should be queued when content is blank");
    });
  });
});
