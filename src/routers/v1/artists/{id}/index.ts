import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import {
  checkIsUserSubscriber,
  findProfileIdForURLSlug,
  singleInclude,
  whereForAllProfilesThisLabelCanEdit,
} from "../../../../utils/artist";
import { processSingleProfile } from "../../../../utils/serialize/artist";

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
      let isUserSubscriber = false;
      if (parsedId) {
        const canManage =
          !!loggedInUser &&
          (await prisma.profile.findFirst({
            where: {
              id: parsedId,
              enabled: true,
              ...whereForAllProfilesThisLabelCanEdit(loggedInUser.id),
            },
            select: { id: true },
          })) !== null;

        const profile = await prisma.profile.findFirst({
          where: {
            id: parsedId,
            enabled: true,
          },
          include: singleInclude({
            includeDefaultTier,
            includePrivate: canManage,
          }) as any,
        });

        if (!profile) {
          return res.status(404).json({ error: "Artist not found" });
        }

        isUserSubscriber = await checkIsUserSubscriber(loggedInUser, parsedId);

        return res.json({
          result: processSingleProfile(
            profile as any,
            loggedInUser?.id,
            isUserSubscriber
          ),
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
          $ref: "#/definitions/Profile",
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
