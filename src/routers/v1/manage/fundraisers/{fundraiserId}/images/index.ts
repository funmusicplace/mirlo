import prisma from "@mirlo/prisma";
import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  fundraiserBelongsToLoggedInUser,
  userOrAppAuthenticated,
} from "../../../../../../auth/passport";
import { processFundraiserImage } from "../../../../../../queues/processImages";
import { serializeFundraiserImage } from "../../../../../../serializers/fundraiser";
import { fundraiserImagesInclude } from "../../../../../../utils/fundraiser";
import {
  assertListsEveryImage,
  busboyOptions,
} from "../../../../../../utils/images";

type Params = {
  fundraiserId: string;
};

export default function () {
  const operations = {
    POST: [
      userOrAppAuthenticated,
      fundraiserBelongsToLoggedInUser,
      busboy(busboyOptions),
      POST,
    ],
    PUT: [userOrAppAuthenticated, fundraiserBelongsToLoggedInUser, PUT],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as unknown as Params;
    try {
      const { jobId, imageId } = await processFundraiserImage({ req, res })(
        Number(fundraiserId)
      );

      res.json({ result: { jobId, imageId } });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Adds an image to the end of a fundraiser's images",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
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
    const fundraiserId = Number((req.params as unknown as Params).fundraiserId);
    const { fundraiserImageIds } = req.body as {
      fundraiserImageIds?: string[];
    };

    try {
      const existing = await prisma.fundraiserImage.findMany({
        where: { fundraiserId },
        select: { id: true },
      });

      assertListsEveryImage(
        fundraiserImageIds,
        existing.map((i) => i.id),
        "fundraiserImageIds must list every image of this fundraiser"
      );

      await prisma.$transaction(
        fundraiserImageIds.map((id, position) =>
          prisma.fundraiserImage.update({ where: { id }, data: { position } })
        )
      );

      const images = await prisma.fundraiserImage.findMany({
        where: { fundraiserId },
        ...fundraiserImagesInclude,
      });

      res.json({ results: images.map(serializeFundraiserImage) });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Reorders a fundraiser's images; the first is the cover",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "order",
        required: true,
        schema: {
          type: "object",
          required: ["fundraiserImageIds"],
          properties: {
            fundraiserImageIds: { type: "array", items: { type: "string" } },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "The fundraiser's images in their new order",
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
