import { NextFunction, Request, Response } from "express";
import fetch from "node-fetch";
import { AppError } from "../../utils/error";
import sendMail from "../../jobs/send-mail";
import { Job } from "bullmq";

const { CLOUDFLARE_TURNSTILE_API_SECRET } = process.env;

async function checkCloudFlare(token: unknown, ip: unknown) {
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: JSON.stringify({
      secret: CLOUDFLARE_TURNSTILE_API_SECRET,
      response: token,
      remoteip: ip,
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const outcome = await result.json();
  if (outcome.success) {
    return true;
  } else {
    throw new AppError({ httpCode: 400, description: "Sounds like a robot" });
  }
}

export default function () {
  const operations = {
    POST: [POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { email, reason, description, trackGroupId } = req.body;
    const connectingIP = req.body["CF-Connecting-IP"];
    const cfTurnstile = req.body["cfTurnstile"];

    try {
      await checkCloudFlare(cfTurnstile, connectingIP);

      await sendMail({
        data: {
          template: "report-album-problem",
          message: {
            to: "hi@mirlo.space",
          },
          locals: {
            email,
            reason,
            description,
            trackGroupId,
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
