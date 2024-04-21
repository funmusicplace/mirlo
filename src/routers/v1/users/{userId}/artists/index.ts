import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
  userLoggedInWithoutRedirect,
} from "../../../../../auth/passport";

import prisma from "../../../../../../prisma/prisma";
import logger from "../../../../../logger";
import slugify from "slugify";

type Params = {
  artistId: number;
  userId: string;
};

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
  "login",
  "password-reset",
  "artists",
  "releases",
];

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
    POST: [userAuthenticated, userHasPermission("owner"), POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;
    try {
      if (userId) {
        const where = {
          userId: Number(userId),
          ...(loggedInUser && loggedInUser.id === Number(userId)
            ? {}
            : { enabled: true }),
        };
        const artists = await prisma.artist.findMany({
          where,
        });
        res.json({ results: artists });
      } else {
        res.status(400);
        res.json({
          error: "Invalid route",
        });
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns user artists",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
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

  // FIXME: only allow creation for logged in user.
  async function POST(req: Request, res: Response, next: NextFunction) {
    const { name, bio, urlSlug } = req.body;
    const { userId } = req.params as unknown as Params;
    try {
      if (forbiddenNames.includes(urlSlug)) {
        res.status(400);
        res.send({
          error: `"urlSlug" can't be one of: ${forbiddenNames.join(", ")}`,
        });
        return next();
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
              id: Number(userId),
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
      res.json({ result });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Creates an artist belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
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
