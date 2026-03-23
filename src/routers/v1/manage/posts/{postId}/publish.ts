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

      // If post is being reverted to draft (isDraft transitioning from false to true),
      // remove any pending notification jobs to prevent emails from being sent.
      // This provides a grace period for users to unpublish if needed.
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
