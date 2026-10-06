import prisma from "@mirlo/prisma";
import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  merchBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { processMerchImage } from "../../../../../../queues/processImages";
import { serializeMerchImage } from "../../../../../../serializers/merch";
import { AppError } from "../../../../../../utils/error";
import { busboyOptions } from "../../../../../../utils/images";
import { merchImagesInclude } from "../../../../../../utils/merch";

type Params = {
  merchId: string;
};

export default function () {
  const operations = {
    POST: [
      userAuthenticated,
      merchBelongsToLoggedInUser,
      busboy(busboyOptions),
      POST,
    ],
    PUT: [userAuthenticated, merchBelongsToLoggedInUser, PUT],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { merchId } = req.params as unknown as Params;
    try {
      const { jobId, imageId } = await processMerchImage({ req, res })(merchId);

      res.json({ result: { jobId, imageId } });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Adds an image to the end of a merch item's images",
    parameters: [
      {
        in: "path",
        name: "merchId",
        required: true,
        type: "string",
      },
      {
        in: "formData",
        name: "file",
        type: "file",
        required: true,
        description: "The image to upload",
      },
    ],
    responses: {
      200: {
        description: "The optimize-image job and the new image's id",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { merchId } = req.params as unknown as Params;
    const { merchImageIds } = req.body as { merchImageIds?: string[] };

    try {
      const existing = await prisma.merchImage.findMany({
        where: { merchId },
        select: { id: true },
      });

      const existingIds = existing.map((i) => i.id).sort();
      if (
        !Array.isArray(merchImageIds) ||
        merchImageIds.length !== existingIds.length ||
        [...merchImageIds].sort().some((id, i) => id !== existingIds[i])
      ) {
        throw new AppError({
          httpCode: 400,
          description: "merchImageIds must list every image of this merch",
        });
      }

      await prisma.$transaction(
        merchImageIds.map((id, position) =>
          prisma.merchImage.update({ where: { id }, data: { position } })
        )
      );

      const images = await prisma.merchImage.findMany({
        where: { merchId },
        ...merchImagesInclude,
      });

      res.json({ results: images.map(serializeMerchImage) });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Reorders a merch item's images; the first is the primary image",
    parameters: [
      {
        in: "path",
        name: "merchId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "order",
        required: true,
        schema: {
          type: "object",
          required: ["merchImageIds"],
          properties: {
            merchImageIds: { type: "array", items: { type: "string" } },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "The merch item's images in their new order",
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
