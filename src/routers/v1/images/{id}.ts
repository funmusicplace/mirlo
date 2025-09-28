import { NextFunction, Request, Response } from "express";
import { User } from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import {
  addSizesToImage,
  checkIsUserSubscriber,
  findArtistIdForURLSlug,
  processSingleArtist,
  singleInclude,
} from "../../../utils/artist";
import {
  headersAreForActivityPub,
  turnArtistIntoActor,
} from "../../../activityPub/utils";
import { finalImageBucket } from "../../../utils/minio";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    if (!id || id === "undefined") {
      return res.status(400);
    }
    try {
      const image = await prisma.image.findFirst({
        where: {
          id: id,
        },
      });

      if (!image) {
        res.status(404);
        return next();
      }

      res.json({
        result: addSizesToImage(finalImageBucket, image),
      });
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
      },
    ],
    responses: {
      200: {
        description: "An artist that matches the id",
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
