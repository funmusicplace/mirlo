import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/error";
import sendMail from "../../jobs/send-mail";
import { Job } from "bullmq";
import prisma from "@mirlo/prisma";
import { checkCloudFlareTurnstile } from "../../utils/cloudflare";

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

      let trackGroup;
      if (trackGroupId) {
        if (!isNaN(Number(trackGroupId))) {
          trackGroup = await prisma.trackGroup.findUnique({
            where: { id: Number(trackGroupId) },
            include: {
              artist: true,
            },
          });
          if (!trackGroup) {
            throw new AppError({
              httpCode: 400,
              description: "Invalid track group",
            });
          }
        }
      }

      await sendMail({
        data: {
          template: "report-album-problem",
          message: {
            to: "hi@mirlo.space",
          },
          locals: {
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            email,
            reason,
            description,
            trackGroupId,
            trackGroup,
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

  return operations;
}
