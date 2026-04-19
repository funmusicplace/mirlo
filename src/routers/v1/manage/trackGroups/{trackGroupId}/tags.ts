import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  trackGroupBelongsToLoggedInUser,
} from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";
import prisma from "@mirlo/prisma";
import { flatten, uniq } from "lodash";

type Params = {
  trackGroupId: number;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, trackGroupBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const tags = req.body as unknown as string[];
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const trackgroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );

      await prisma.trackGroupTag.deleteMany({
        where: {
          trackGroupId: trackgroup.id,
        },
      });

      const splitTags = flatten(tags.map((t) => t.split(",")));

      const trimmedTags = uniq(splitTags.map((t) => t.trim())).map((t) =>
        t.trim().toLowerCase()
      );

      const newTagIds = [];
      for (const tag of trimmedTags) {
        const tagObject = await prisma.tag.upsert({
          create: {
            tag,
          },
          update: {
            tag,
          },
          where: {
            tag,
          },
        });
        newTagIds.push(tagObject.id);
      }

      await prisma.trackGroupTag.createMany({
        data: newTagIds.map((id) => ({
          trackGroupId: trackgroup.id,
          tagId: id,
        })),
      });

      const newTags = await prisma.trackGroupTag.findMany({
        where: {
          trackGroupId: trackgroup.id,
        },
        include: {
          tag: true,
        },
      });
      res.json({
        results: newTags,
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Replaces the trackgroup's tags",
    parameters: [
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "tags",
        schema: {
          description: "The list of tags to add",
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Updated trackgroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
