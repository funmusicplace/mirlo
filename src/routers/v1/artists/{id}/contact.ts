import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import sendMail from "../../../../jobs/send-mail";
import { Job } from "bullmq";
import { getClient } from "../../../../activityPub/utils";
import { AppError } from "../../../../utils/error";

type Params = { id: string };

const CONTACT_RATE_LIMIT = 2;
const CONTACT_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 5000;

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    const { message } = req.body as { message?: string };
    const sender = req.user as User;

    try {
      const trimmed = typeof message === "string" ? message.trim() : "";
      if (!trimmed) {
        throw new AppError({
          httpCode: 400,
          description: "Message is required",
        });
      }
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        throw new AppError({
          httpCode: 400,
          description: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
        });
      }

      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
          enabled: true,
          deletedAt: null,
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });

      if (!artist) {
        throw new AppError({ httpCode: 404, description: "Artist not found" });
      }

      if (artist.user.id === sender.id) {
        throw new AppError({
          httpCode: 400,
          description: "You can't contact yourself",
        });
      }

      if (!artist.allowDirectMessages) {
        throw new AppError({
          httpCode: 403,
          description: "This artist is not accepting direct messages",
        });
      }

      const recentCount = await prisma.notification.count({
        where: {
          notificationType: "ARTIST_CONTACT_MESSAGE",
          artistId: artist.id,
          relatedUserId: sender.id,
          createdAt: { gte: new Date(Date.now() - CONTACT_RATE_WINDOW_MS) },
        },
      });
      if (recentCount >= CONTACT_RATE_LIMIT) {
        throw new AppError({
          httpCode: 429,
          description:
            "You've reached the daily limit for messaging this artist. Try again later.",
        });
      }

      await prisma.notification.create({
        data: {
          notificationType: "ARTIST_CONTACT_MESSAGE",
          userId: artist.user.id,
          relatedUserId: sender.id,
          artistId: artist.id,
          content: trimmed,
        },
      });

      const senderName = sender.name || sender.email;
      sendMail({
        data: {
          template: "artist-contact-message",
          message: {
            to: artist.user.email,
            replyTo: sender.email,
          },
          locals: {
            artist,
            sender: { name: senderName, email: sender.email },
            message: trimmed,
            host: process.env.API_DOMAIN,
            client: (await getClient()).applicationUrl,
          },
        },
      } as Job);

      return res
        .status(200)
        .json({ message: "Message sent to artist successfully" });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Send a message to an artist",
    parameters: [
      { in: "path", name: "id", required: true, type: "number" },
      {
        in: "body",
        name: "contact",
        schema: {
          type: "object",
          required: ["message"],
          properties: { message: { type: "string" } },
        },
      },
    ],
    responses: {
      200: { description: "Message sent" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
