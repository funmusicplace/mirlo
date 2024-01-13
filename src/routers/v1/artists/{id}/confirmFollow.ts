import { NextFunction, Request, Response } from "express";

import prisma from "../../../../../prisma/prisma";

import {
  confirmArtistIdExists,
  subscribeUserToArtist,
} from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    GET: [confirmArtistIdExists, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;

    const { email, token } = req.query as unknown as {
      email?: string;
      token?: string;
    };

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

      const confirmation =
        await prisma.artistUserSubscriptionConfirmation.findFirst({
          where: {
            artistId: Number(artistId),
            email,
            token,
            tokenExpiration: { gte: new Date() },
          },
        });

      if (!confirmation) {
        next(
          new AppError({
            name: "Token not found",
            httpCode: 404,
            description: "Token not found",
          })
        );
      }

      if (confirmation) {
        let user = await prisma.user.findFirst({
          where: {
            email: confirmation.email,
          },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: confirmation.email,
              emailConfirmationToken: null,
              emailConfirmationExpiration: null,
            },
          });
        }

        if (artist) {
          await subscribeUserToArtist(artist, user);
          await prisma.artistUserSubscriptionConfirmation.delete({
            where: {
              id: confirmation.id,
            },
          });

          res.redirect(
            process.env.REACT_APP_CLIENT_DOMAIN +
              `/${artist.urlSlug}/?followSuccess=true`
          );
        }
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
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
