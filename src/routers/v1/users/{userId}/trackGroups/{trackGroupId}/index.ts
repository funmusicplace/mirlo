import { Artist, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";
import {
  contentBelongsToLoggedInUserArtist,
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import processor from "../../../../../../utils/trackGroup";
import { doesTrackGroupBelongToUser } from "../../../../../../utils/ownership";
import prisma from "../../../../../../../prisma/prisma";
import { deleteTrackGroup } from "../../../../../../utils/trackGroup";
import logger from "../../../../../../logger";
import slugify from "slugify";

type Params = {
  trackGroupId: string;
  userId: string;
};

const findNewSlug = async (
  slug: string,
  counter: number,
  artistId: number
): Promise<string> => {
  const verifySlug = await prisma.trackGroup.findFirst({
    where: {
      urlSlug: `${slug}`,
      artistId: artistId,
    },
  });
  if (verifySlug) {
    return await findNewSlug(`${slug}-${counter + 1}`, counter + 1, artistId);
  } else {
    return slug;
  }
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, contentBelongsToLoggedInUserArtist, PUT],
    DELETE: [userAuthenticated, trackGroupBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, trackGroupBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { userId, trackGroupId } = req.params as unknown as Params;
    try {
      const trackgroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        Number(userId)
      );

      if (!trackgroup) {
        res.status(400).json({
          error: "Trackgroup must belong to user",
        });
        return next();
      }

      res.status(200).json({ result: processor.single(trackgroup) });
    } catch (e) {
      logger.error(e);
      res.status(500).json({
        error: "Something went wrong",
      });
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const data = req.body;
    const loggedInUser = req.user as User;

    try {
      const artist = (await prisma.artist.findFirst({
        where: {
          userId: loggedInUser.id,
          id: Number(data.artistId),
        },
      })) as Artist; // By now we know that the artist exists

      const newValues = pick(data, [
        "title",
        "releaseDate",
        "published",
        "type",
        "about",
        "minPrice",
        "credits",
      ]);

      await prisma.trackGroup.updateMany({
        where: { id: Number(trackGroupId), artistId: artist.id },
        data: newValues,
      });

      let trackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(trackGroupId) },
      });

      if (trackGroup?.title && trackGroup.urlSlug.includes("mi-temp-slug")) {
        let slug = slugify(newValues.title).toLowerCase();

        if (slug === "") {
          slug = "blank";
        }
        const newSlug = await findNewSlug(slug, 0, artist.id);
        await prisma.trackGroup.update({
          where: { id: trackGroup.id },
          data: {
            urlSlug: newSlug,
          },
        });
        trackGroup = await prisma.trackGroup.findFirst({
          where: { id: Number(trackGroupId) },
        });
      }

      res.json({ result: trackGroup });
    } catch (error) {
      logger.error("error", error);
      res.status(400).json({
        error: `TrackGroup with ID ${trackGroupId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId, userId } = req.params as {
      trackGroupId: string;
      userId: string;
    };
    try {
      const trackgroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        Number(userId)
      );

      if (!trackgroup) {
        res.status(400).json({
          error: "Trackgroup must belong to user",
        });
        return next();
      }

      await deleteTrackGroup(Number(trackGroupId), true);

      res.json({ message: "Success" });
    } catch (e) {
      logger.error(`DELETE /users/{userId}/trackGroups/{trackgroupId} ${e}`);
      res.status(500);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
