import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import sendMail from "../../../../jobs/send-mail";
import { Job } from "bullmq";
import { getClient } from "../../../../activityPub/utils";

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { email } = req.query;

    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          artist: true,
        },
      });

      if (!trackGroup) {
        res.status(404);
        return next();
      }
      sendMail({
        data: {
          template: "album-purchase-link",
          message: {
            to: email,
          },
          locals: {
            trackGroup,
            client: (await getClient()).applicationUrl,
          },
        },
      } as Job);
      res.status(200).json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary:
      "Sends an email to the user containing a link to the album's purchase page",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A link to the album page",
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
