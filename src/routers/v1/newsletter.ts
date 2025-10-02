import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import fetch from "node-fetch";
import { User } from "@mirlo/prisma/client";

import { AppError } from "../../utils/error";
import { getSiteSettings } from "../../utils/settings";
import { subscribeUserToArtist } from "../../utils/artist";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const { CLOUDFLARE_TURNSTILE_API_SECRET } = process.env;

async function checkCloudFlare(token: unknown, ip: string | undefined) {
  if (!CLOUDFLARE_TURNSTILE_API_SECRET) {
    return;
  }

  if (!token || typeof token !== "string") {
    throw new AppError({
      httpCode: 400,
      description: "Spam protection challenge is required",
    });
  }

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
  if (!outcome.success) {
    throw new AppError({
      httpCode: 400,
      description: "Spam protection failed",
    });
  }
}

export default function () {
  const operations = {
    POST: [POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, cfTurnstile } = req.body ?? {};

      if (!email || typeof email !== "string") {
        throw new AppError({
          httpCode: 400,
          description: "Email is required",
        });
      }

      const normalisedEmail = email.trim().toLowerCase();
      const authenticatedUser = req.user as User | undefined;
      const matchingAuthenticatedUser = Boolean(
        authenticatedUser &&
          authenticatedUser.email &&
          authenticatedUser.email.toLowerCase() === normalisedEmail
      );

      if (!emailRegex.test(normalisedEmail)) {
        throw new AppError({
          httpCode: 400,
          description: "Email must be valid",
        });
      }

      const connectingIP =
        req.get("cf-connecting-ip") ?? req.ip ?? req.socket.remoteAddress;
      await checkCloudFlare(cfTurnstile, connectingIP ?? undefined);

      const settings = await getSiteSettings();
      const instanceArtistId = settings.settings?.instanceArtistId;

      if (!instanceArtistId) {
        throw new AppError({
          httpCode: 500,
          description: "Instance artist not configured",
        });
      }

      const artist = await prisma.artist.findFirst({
        where: {
          id: instanceArtistId,
        },
        include: {
          user: true,
          subscriptionTiers: true,
        },
      });

      if (!artist) {
        throw new AppError({
          httpCode: 404,
          description: "Instance artist not found",
        });
      }

      let user = await prisma.user.findFirst({
        where: { email: normalisedEmail },
        select: {
          id: true,
          currency: true,
          receiveMailingList: true,
          emailConfirmationToken: true,
        },
      });

      if (!user && matchingAuthenticatedUser && authenticatedUser) {
        user = await prisma.user.findFirst({
          where: { id: authenticatedUser.id },
          select: {
            id: true,
            currency: true,
            receiveMailingList: true,
            emailConfirmationToken: true,
          },
        });
      }

      if (!user) {
        throw new AppError({
          httpCode: 401,
          description: "Please verify your email before subscribing.",
        });
      }

      if (authenticatedUser && authenticatedUser.id !== user.id) {
        throw new AppError({
          httpCode: 403,
          description: "This email belongs to a different user.",
        });
      }

      if (!matchingAuthenticatedUser && user.emailConfirmationToken) {
        throw new AppError({
          httpCode: 401,
          description: "Please verify your email before subscribing.",
        });
      }

      if (!user.receiveMailingList) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            receiveMailingList: true,
          },
          select: {
            id: true,
            currency: true,
            receiveMailingList: true,
            emailConfirmationToken: true,
          },
        });
      }

      await subscribeUserToArtist(artist, {
        id: user.id,
        currency: user.currency,
      });

      return res.status(200).json({ message: "success" });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Adds an email address to the Mirlo newsletter",
    parameters: [
      {
        in: "body",
        name: "newsletter",
        schema: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
            },
            cfTurnstile: {
              type: "string",
              description:
                "Cloudflare Turnstile token used to confirm the requester is human.",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Successfully added to the newsletter",
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
