import { NextFunction, Request, Response } from "express";
import {
  contentBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import { AppError } from "../../../../utils/error";
import { deleteDownloadableContent } from "../../../../utils/content";

type Params = {
  contentId: string;
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
    DELETE: [userAuthenticated, contentBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, contentBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { contentId } = req.params as unknown as Params;

    try {
      const content = await prisma.downloadableContent.findFirst({
        where: {
          id: contentId,
        },
        include: {
          trackGroups: true,
          merch: true,
        },
      });

      if (!content) {
        throw new AppError({
          httpCode: 404,
          description: "TrackGroup not found",
        });
      }

      return res.status(200).json({ result: content });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { contentId } = req.params as Params;
    try {
      await deleteDownloadableContent(contentId);

      return res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a downloadableContent belonging to a user",
    parameters: [
      {
        in: "path",
        name: "downloadableContentId",
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
