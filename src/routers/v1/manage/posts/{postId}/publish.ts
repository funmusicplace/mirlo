import { Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../../../auth/passport";
import { doesPostBelongToUser } from "../../../../../utils/post";
import { sendPostNotificationQueue } from "../../../../../queues/send-post-notification-queue";
import logger from "../../../../../logger";

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser, PUT],
  };

  async function PUT(req: Request, res: Response) {
    const { postId } = req.params;

    try {
      const existingPost = await prisma.post.findFirst({
        where: { id: Number(postId) || undefined },
      });
      const updatedPost = await prisma.post.update({
        where: { id: Number(postId) || undefined },
        data: { isDraft: !existingPost?.isDraft },
      });

      // If post is being published (isDraft transitioning from true to false),
      // queue the notification job with a 10-minute delay. This gives users
      // a grace period to revert the post if needed. The job is idempotent
      // and can be safely retried by BullMQ.
      if (existingPost?.isDraft === true && updatedPost.isDraft === false) {
        // Only queue if shouldSendEmail is true and content is not blank.
        const hasContent =
          updatedPost.content && updatedPost.content.trim().length > 0;
        if (updatedPost.shouldSendEmail && hasContent) {
          logger.info(
            `publish: queueing post notification job for post ${postId} with 10 minute delay`
          );
          await sendPostNotificationQueue.add(
            "send-post-notification",
            { postId: updatedPost.id },
            { delay: 10 * 60 * 1000 } // 10 minutes in milliseconds
          );
        } else {
          logger.info(
            `publish: skipping notification queue for post ${postId} (shouldSendEmail=${updatedPost.shouldSendEmail}, hasContent=${hasContent})`
          );
        }
      }

      // If post is being reverted to draft (isDraft transitioning from false to true),
      // remove any pending notification jobs to prevent emails from being sent
      if (existingPost?.isDraft === false && updatedPost.isDraft === true) {
        logger.info(
          `publish: removing pending notification job for post ${postId}`
        );
        // Find all jobs for this post and remove pending ones
        const jobs = await sendPostNotificationQueue.getJobs([
          "delayed",
          "waiting",
          "active",
        ]);
        for (const job of jobs) {
          if (job.data.postId === Number(postId)) {
            await job.remove();
            logger.info(
              `publish: removed pending job ${job.id} for post ${postId}`
            );
          }
        }
      }

      res.json({ result: updatedPost });
    } catch (error) {
      res.json({
        error: `Post with ID ${postId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Publishes a Post",
    parameters: [
      {
        in: "path",
        name: "postId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Updated post",
        schema: {
          $ref: "#/definitions/Post",
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
