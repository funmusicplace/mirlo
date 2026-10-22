import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  canUserCreateProfiles,
  userAuthenticated,
  userOrAppAuthenticated,
} from "../../../../auth/passport";
import { serializeProfile } from "../../../../serializers/artist";
import { serializeManagedProfile } from "../../../../serializers/profileManager";
import {
  asSlugConflictError,
  createProfileForUser,
  generateUniqueProfileSlug,
  isProfileSlugTaken,
  whereForProfilesUserOwnsOrManages,
} from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import generateSlug from "../../../../utils/generateSlug";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userOrAppAuthenticated, canUserCreateProfiles, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const profiles = await prisma.profile.findMany({
        where: whereForProfilesUserOwnsOrManages(loggedInUser.id),
        select: {
          id: true,
          name: true,
          urlSlug: true,
          isLabelProfile: true,
          avatar: true,
          userId: true,
        },
      });
      res.json({
        results: profiles.map((profile) =>
          serializeManagedProfile(profile, loggedInUser.id)
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns artists the user owns or manages. Each has a `relationship` of `owner` or `manager`",
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
      let newSlug: string;
      if (urlSlug) {
        newSlug = generateSlug(urlSlug);
        if (await isProfileSlugTaken(newSlug)) {
          throw new AppError({
            description: `"urlSlug" is already in use`,
            httpCode: 400,
          });
        }
      } else {
        newSlug = await generateUniqueProfileSlug(name);
      }

      const result = await createProfileForUser(user, {
        name,
        bio,
        urlSlug: newSlug,
      });
      res.json({
        result: serializeProfile(result as any, Number(user.id)),
      });
    } catch (e) {
      next(asSlugConflictError(e));
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
