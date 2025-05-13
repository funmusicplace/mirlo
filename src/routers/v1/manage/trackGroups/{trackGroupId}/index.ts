import { Artist, User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";
import {
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import processor, {
  trackGroupSingleInclude,
} from "../../../../../utils/trackGroup";
import prisma from "@mirlo/prisma";
import { deleteTrackGroup } from "../../../../../utils/trackGroup";
import slugify from "slugify";
import { AppError } from "../../../../../utils/error";

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
    PUT: [userAuthenticated, trackGroupBelongsToLoggedInUser, PUT],
    DELETE: [userAuthenticated, trackGroupBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, trackGroupBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          ...trackGroupSingleInclude({
            loggedInUserId: Number(loggedInUser.id),
            ownerId: Number(loggedInUser.id),
          }),
          merch: {
            include: {
              images: true,
            },
          },
        },
      });

      if (!trackGroup) {
        throw new AppError({
          httpCode: 404,
          description: "TrackGroup not found",
        });
      }

      return res.status(200).json({ result: processor.single(trackGroup) });
    } catch (e) {
      next(e);
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const data = req.body;

    try {
      const artist = (await prisma.artist.findFirst({
        where: {
          id: Number(data.artistId),
        },
      })) as Artist; // By now we know that the artist exists
      // and the user can edit it

      const newValues = pick(data, [
        "title",
        "releaseDate",
        "published",
        "type",
        "about",
        "minPrice",
        "credits",
        "platformPercent",
        "isGettable",
      ]);

      await prisma.trackGroup.updateMany({
        where: { id: Number(trackGroupId), artistId: artist.id },
        data: newValues,
      });

      let trackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(trackGroupId) },
      });

      if (trackGroup?.title && trackGroup.urlSlug.includes("mi-temp-slug")) {
        let slug = slugify(newValues.title, { strict: true }).toLowerCase();

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
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup belonging to a user",
    parameters: [
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
    const { trackGroupId } = req.params as {
      trackGroupId: string;
    };
    try {
      await deleteTrackGroup(Number(trackGroupId), true);

      return res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a trackGroup belonging to a user",
    parameters: [
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
