import prisma from "@mirlo/prisma";
import { Job } from "bullmq";
import { NextFunction, Request, Response } from "express";

import sendMail from "../../jobs/send-mail";
import { processSingleTrackGroup } from "../../serializers/trackGroup";
import { checkCloudFlareTurnstile } from "../../utils/cloudflare";
import { AppError } from "../../utils/error";
import { getClient } from "../../utils/getClient";

export default function () {
  const operations = {
    POST: [POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { email, reason, description, trackGroupId } = req.body;
    const connectingIP = req.body["CF-Connecting-IP"];
    const cfTurnstile = req.body["cfTurnstile"];

    try {
      await checkCloudFlareTurnstile({
        token: cfTurnstile,
        ip: connectingIP,
        missingTokenMessage: "Sounds like a robot",
        failureMessage: "Sounds like a robot",
      });

      const trackGroup = await prisma.trackGroup.findUnique({
        where: { id: trackGroupId },
        include: {
          profile: true,
        },
      });

      if (!trackGroup) {
        throw new AppError({
          httpCode: 400,
          description: "Invalid track group",
        });
      }

      await prisma.contentFlag.create({
        data: {
          source: "USER_REPORT",
          reason,
          description,
          reporterEmail: email,
          trackGroupId: trackGroup.id,
          profileId: trackGroup.profileId,
        },
      });

      await sendMail({
        data: {
          template: "report-album-problem",
          message: {
            to: "hi@mirlo.space",
          },
          locals: {
            client: (await getClient()).applicationUrl,
            email,
            reason,
            description,
            trackGroupId,
            trackGroup: processSingleTrackGroup(trackGroup),
          },
        },
      } as Job);
      return res.json({
        message: "success",
      });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Reports a problem with a release",
    parameters: [
      {
        in: "body",
        name: "flag",
        required: true,
        schema: {
          type: "object",
          required: ["email", "reason", "description", "trackGroupId"],
          properties: {
            email: { type: "string" },
            reason: {
              type: "string",
              enum: ["copyrightViolation", "inappropriateContent"],
            },
            description: { type: "string" },
            trackGroupId: { type: "integer" },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "The report was stored",
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
