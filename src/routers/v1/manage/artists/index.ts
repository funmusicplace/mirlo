import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";

import prisma from "@mirlo/prisma";
import slugify from "slugify";
import { AppError } from "../../../../utils/error";

const forbiddenNames = [
  "mirlo",
  "admin",
  "manage",
  "profile",
  "signup",
  "about",
  "pages",
  "widget",
  "post",
  "label",
  "track",
  "login",
  "password-reset",
  "artists",
  "releases",
  "user",
  "username",
  "you",
  "guest",
  "fulfillment",
  "account",
  "administrator",
  "system",
  "help",
  "error",
];

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const loggedInUser = req.user as User;
    try {
      const where = {
        userId: Number(loggedInUser.id),
      };
      const artists = await prisma.artist.findMany({
        where,
      });
      res.json({ results: artists });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns user artists",
    responses: {
      200: {
        description: "A track that matches the id",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Artist",
          },
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { name, bio, urlSlug } = req.body;
    const user = req.user as User;
    try {
      if (forbiddenNames.includes(urlSlug)) {
        throw new AppError({
          description: `"urlSlug" can't be one of: ${forbiddenNames.join(", ")}`,
          httpCode: 400,
        });
      }

      const slug = slugify(
        urlSlug?.toLowerCase() ?? slugify(name.toLowerCase()),
        {
          strict: true,
        }
      );

      const result = await prisma.artist.create({
        data: {
          name,
          bio,
          urlSlug: slug,
          user: {
            connect: {
              id: Number(user.id),
            },
          },
          subscriptionTiers: {
            create: {
              name: "follow",
              description: "follow an artist",
              minAmount: 0,
              isDefaultTier: true,
            },
          },
        },
      });

      if (user.isLabelAccount) {
        await prisma.artistLabel.create({
          data: {
            artistId: result.id,
            labelUserId: user.id,
            isLabelApproved: true,
            canLabelManageArtist: true,
            canLabelAddReleases: true,
            isArtistApproved: true,
          },
        });
      }
      res.json({ result });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Creates an artist belonging to a user",
    parameters: [
      {
        in: "body",
        name: "artist",
        schema: {
          $ref: "#/definitions/Artist",
        },
      },
    ],
    responses: {
      200: {
        description: "Created artist",
        schema: {
          $ref: "#/definitions/Artist",
        },
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
