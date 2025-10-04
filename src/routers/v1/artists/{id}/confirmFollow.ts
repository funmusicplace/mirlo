import { NextFunction, Request, Response } from "express";

import prisma from "@mirlo/prisma";

import {
  confirmArtistIdExists,
  subscribeUserToArtist,
} from "../../../../utils/artist";
import { getSiteSettings } from "../../../../utils/settings";

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
        res.redirect(
          process.env.REACT_APP_CLIENT_DOMAIN + `/?message=Something went wrong`
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

        const settings = await getSiteSettings();
        const instanceArtistId = settings.settings?.instanceArtistId;

        if (
          user &&
          artist &&
          instanceArtistId &&
          artist.id === instanceArtistId &&
          !user.receiveMailingList
        ) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { receiveMailingList: true },
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
              `/${artist.urlSlug}/checkout-complete?purchaseType=follow`
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
