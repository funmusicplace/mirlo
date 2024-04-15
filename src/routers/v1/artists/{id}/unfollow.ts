import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import { AppError } from "../../../../utils/error";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    const user = req.user as User;
    const { email } = req.body;

    try {
      let userIdToRemove: number | undefined = user?.id;
      if (!userIdToRemove && email && typeof email === "string") {
        const relevantUser = await prisma.user.findFirst({
          where: {
            email,
          },
          select: {
            id: true,
          },
        });
        userIdToRemove = relevantUser?.id;
      }

      if (userIdToRemove) {
        const artist = await prisma.artist.findFirst({
          where: {
            id: Number(artistId),
          },
          include: {
            subscriptionTiers: true,
          },
        });

        if (artist) {
          await prisma.artistUserSubscription.deleteMany({
            where: {
              artistSubscriptionTier: {
                artistId: artist.id,
                isDefaultTier: true,
              },
              userId: userIdToRemove,
            },
          });

          res.status(200).json({
            message: "success",
          });
        } else {
          throw new AppError({
            httpCode: 404,
            description: "Artist not found",
          });
        }
      } else {
        throw new AppError({
          httpCode: 404,
          description: "User not found",
        });
      }
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Unfollows a user to an artist",
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
        description: "Removed artistSubscriptionTier",
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
