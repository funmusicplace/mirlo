import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import {
  confirmArtistIdExists,
  createSubscriptionConfirmation,
  subscribeUserToArtist,
} from "../../../../utils/artist";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [confirmArtistIdExists, userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    const loggedInuser = req.user as User;

    const { email } = req.body;

    try {
      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
        },
        include: {
          user: true,
          subscriptionTiers: true,
        },
      });

      if (!loggedInuser?.id && email && artist) {
        await createSubscriptionConfirmation(email, artist);
        res.status(200).json({
          message: "Success",
        });
      } else {
        const user = await prisma.user.findFirst({
          where: {
            id: loggedInuser.id,
          },
        });

        if (artist) {
          const results = await subscribeUserToArtist(artist, user);

          res.status(200).json({
            results,
          });
        }
      }
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
