import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import fetch from "node-fetch";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import {
  confirmArtistIdExists,
  createSubscriptionConfirmation,
  subscribeUserToArtist,
} from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import { getSiteSettings } from "../../../../utils/settings";

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

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [confirmArtistIdExists, userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    const loggedInuser = req.user as User | undefined;

    const { email, cfTurnstile } = req.body ?? {};
    const normalisedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : undefined;

    try {
      const isLoggedIn = Boolean(loggedInuser?.id);

      if (!isLoggedIn && !normalisedEmail) {
        throw new AppError({
          httpCode: 400,
          description: "Email is required",
        });
      }

      if (normalisedEmail && !emailRegex.test(normalisedEmail)) {
        throw new AppError({
          httpCode: 400,
          description: "Email must be valid",
        });
      }

      if (!isLoggedIn) {
        const connectingIP =
          req.get("cf-connecting-ip") ?? req.ip ?? req.socket.remoteAddress;
        await checkCloudFlare(cfTurnstile, connectingIP ?? undefined);
      }

      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
        },
        include: {
          user: true,
          subscriptionTiers: true,
        },
      });

      if (!artist) {
        throw new AppError({
          httpCode: 404,
          description: "Artist not found",
        });
      }

      const settings = await getSiteSettings();
      const instanceArtistId = settings.settings?.instanceArtistId;
      const requiresVerifiedEmail =
        instanceArtistId !== undefined && instanceArtistId !== null
          ? artist.id === instanceArtistId
          : false;

      const userSelect = {
        id: true,
        currency: true,
        email: true,
        receiveMailingList: true,
        emailConfirmationToken: true,
      } as const;

      let user: Pick<
        User,
        "id" | "currency" | "email" | "receiveMailingList" | "emailConfirmationToken"
      > | null = null;

      if (isLoggedIn && loggedInuser?.id) {
        user = await prisma.user.findFirst({
          where: { id: loggedInuser.id },
          select: userSelect,
        });

        if (!user) {
          throw new AppError({
            httpCode: 401,
            description: "User not found",
          });
        }

        if (requiresVerifiedEmail && user.emailConfirmationToken) {
          throw new AppError({
            httpCode: 401,
            description: "Please verify your email before subscribing.",
          });
        }

        if (requiresVerifiedEmail && !user.receiveMailingList) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { receiveMailingList: true },
            select: userSelect,
          });
        }

        const results = await subscribeUserToArtist(artist, {
          id: user.id,
          currency: user.currency,
        });

        res.status(200).json({
          results,
        });
        return;
      }

      if (!normalisedEmail) {
        throw new AppError({
          httpCode: 400,
          description: "Email is required",
        });
      }

      user = await prisma.user.findFirst({
        where: { email: normalisedEmail },
        select: userSelect,
      });

      if (
        requiresVerifiedEmail &&
        user?.email &&
        user.email.toLowerCase() === normalisedEmail &&
        user.emailConfirmationToken
      ) {
        throw new AppError({
          httpCode: 401,
          description: "Please verify your email before subscribing.",
        });
      }

      await createSubscriptionConfirmation(normalisedEmail, artist);
      res.status(200).json({
        message: "Success",
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Follows a user to an artist",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
    ],
    responses: {
      200: {
        description: "Created artistSubscriptionTier",
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
