import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    POST,
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as { userId: string };
    const { token } = req.body as { token: string };

    try {
      if (!token) {
        throw new AppError({
          httpCode: 400,
          description: "Token is required",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: {
          id: true,
          email: true,
          pendingEmail: true,
          pendingEmailToken: true,
          pendingEmailExpiration: true,
        },
      });

      if (!user) {
        throw new AppError({
          httpCode: 404,
          description: "User not found",
        });
      }

      if (!user.pendingEmail || !user.pendingEmailToken) {
        throw new AppError({
          httpCode: 400,
          description: "No pending email change",
        });
      }

      if (user.pendingEmailToken !== token) {
        throw new AppError({
          httpCode: 400,
          description: "Invalid token",
        });
      }

      if (
        !user.pendingEmailExpiration ||
        user.pendingEmailExpiration < new Date()
      ) {
        throw new AppError({
          httpCode: 400,
          description: "Token expired",
        });
      }

      // Update the email and clear pending fields
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.pendingEmail,
          pendingEmail: null,
          pendingEmailToken: null,
          pendingEmailExpiration: null,
        },
        select: {
          id: true,
          email: true,
        },
      });

      res.json({ result: updatedUser });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Confirms an email change",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "body",
        required: true,
        schema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "Email change verification token",
            },
          },
          required: ["token"],
        },
      },
    ],
    responses: {
      200: {
        description: "Email successfully changed",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                id: { type: "integer" },
                email: { type: "string" },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid token, expired token, or no pending email change",
      },
      404: {
        description: "User not found",
      },
    },
  };

  return operations;
}
