import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  canUserCreateArtists,
  userAuthenticated,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import generateSlug from "../../../../utils/generateSlug";
import { getSiteSettings } from "../../../../utils/settings";

const forbiddenNames = [
  "mirlo",
  "admin",
  "manage",
  "profile",
  "account",
  "signup",
  "verify-email",
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
  "sales",
  "account",
  "administrator",
  "system",
  "help",
  "error",
  "docs",
];

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, canUserCreateArtists, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const where = {
        userId: Number(loggedInUser.id),
      };
      const artists = await prisma.artist.findMany({
        where,
        include: {
          trackGroups: {
            select: {
              title: true,
            },
          },
        },
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
    let { name, bio, urlSlug } = req.body;
    const settings = await getSiteSettings();
    assertLoggedIn(req);
    const user = req.user;
    try {
      name = name?.trim();
      urlSlug = urlSlug?.trim();
      if (!name) {
        throw new AppError({
          description: '"name" is required',
          httpCode: 400,
        });
      }
      if (forbiddenNames.includes(urlSlug)) {
        throw new AppError({
          description: `"urlSlug" can't be one of: ${forbiddenNames.join(", ")}`,
          httpCode: 400,
        });
      }

      const newSlug = generateSlug(urlSlug, name);

      const result = await prisma.artist.create({
        data: {
          name,
          bio,
          urlSlug: newSlug,
          user: {
            connect: {
              id: Number(user.id),
            },
          },
          properties: {
            colors: settings.settings?.instanceCustomization?.colors ?? {
              primary: "#be3455",
              secondary: "#ffc0cb",
              background: "#f5f0f0",
              foreground: "#111",
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
function generateSlugFromString(urlSlug: any, name: any) {
  throw new Error("Function not implemented.");
}
