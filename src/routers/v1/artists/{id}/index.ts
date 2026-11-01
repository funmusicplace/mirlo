import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { serializeProfile } from "../../../../serializers/artist";
import { serializePost } from "../../../../serializers/post";
import {
  canUserEditProfile,
  findProfileIdForURLSlug,
  singleInclude,
  whereForVisibleProfile,
} from "../../../../utils/artist";
import {
  canUserSeePostContent,
  getUserSubscriptionsForProfile,
} from "../../../../utils/postAccess";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const { includeDefaultTier: includeDefaultTierStr } = req.query as {
      includeDefaultTier?: string;
    };
    const includeDefaultTier = includeDefaultTierStr === "true";
    const loggedInUser = req.user;
    if (!id || id === "undefined") {
      return res.status(400).json({ error: "Invalid artist ID" });
    }
    try {
      const parsedId = await findProfileIdForURLSlug(id);
      if (parsedId) {
        const canManage = await canUserEditProfile(parsedId, loggedInUser);

        const profile = await prisma.profile.findFirst({
          where: {
            id: parsedId,
            ...(loggedInUser?.isAdmin ? {} : whereForVisibleProfile()),
          },
          include: singleInclude({
            includeDefaultTier,
            includePrivate: canManage,
            loggedInUserId: loggedInUser?.id,
          }) as any,
        });

        if (!profile) {
          return res.status(404).json({ error: "Artist not found" });
        }

        const subscriptions = await getUserSubscriptionsForProfile(
          loggedInUser,
          parsedId
        );

        return res.json({
          result: {
            ...serializeProfile(profile as any, loggedInUser?.id, canManage),
            posts: (profile as any).posts?.map((post: any) =>
              serializePost(
                post,
                undefined,
                undefined,
                canUserSeePostContent(post, {
                  isProfileOwner: canManage,
                  subscriptions,
                })
              )
            ),
          },
        });
      } else {
        return res.status(404).json({ error: "Artist not found" });
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns Artist information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
        description: "Artist ID or urlSlug",
      },
      {
        in: "query",
        name: "includeDefaultTier",
        required: false,
        type: "string",
        enum: ["true", "false"],
        description:
          "Include the default (free) subscription tier in subscriptionTiers. Defaults to false.",
      },
    ],
    responses: {
      200: {
        description:
          "An artist matching the id, including trackGroups, merch, and subscriptionTiers",
        schema: {
          $ref: "#/definitions/Artist",
        },
      },
      404: {
        description: "Artist not found",
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
