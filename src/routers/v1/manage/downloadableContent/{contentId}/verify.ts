import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  contentBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import {
  deleteDownloadableContent,
  doesDownloadableContentMatchType,
  isAllowedDownloadableContentMimeType,
} from "../../../../../utils/content";
import { AppError } from "../../../../../utils/error";

type Params = {
  contentId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, contentBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { contentId } = req.params as unknown as Params;
    try {
      const content = await prisma.downloadableContent.findFirst({
        where: { id: contentId },
      });

      if (!content) {
        throw new AppError({
          httpCode: 404,
          description: "Content not found",
        });
      }

      const matches =
        isAllowedDownloadableContentMimeType(content.mimeType) &&
        (await doesDownloadableContentMatchType(content.id, content.mimeType));

      if (!matches) {
        await deleteDownloadableContent(content.id);
        throw new AppError({
          httpCode: 400,
          description: `The uploaded file is not a valid "${content.mimeType}" file`,
        });
      }

      const result = await prisma.downloadableContent.update({
        where: { id: content.id },
        data: { uploadState: "SUCCESS" },
      });

      res.json({ result });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary:
      "Checks that uploaded downloadable content matches its declared type, deleting it if it doesn't",
    parameters: [
      {
        in: "path",
        name: "contentId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "The verified downloadable content",
      },
      400: {
        description: "The file didn't match its declared type and was deleted",
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
