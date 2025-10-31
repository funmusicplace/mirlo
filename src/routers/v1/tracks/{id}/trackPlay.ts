import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { logger } from "../../../../logger";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import {
  FormatOptions,
  basicTrackGroupInclude,
  findTrackPurchaseAndVoidToken,
  findTrackPurchaseBasedOnTokenAndUpdate,
} from "../../../../utils/trackGroup";
import {
  getReadStream,
  statFile,
  trackFormatBucket,
} from "../../../../utils/minio";
import filenamify from "filenamify";
import { cleanHeaderValue } from "../../../../utils/validate-http-headers";
import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackId }: { id?: string } = req.params;
    const user = req.user as User | undefined;

    try {
      const track = await prisma.track.findUnique({
        where: { id: Number(trackId) },
        select: { id: true },
      });

      if (!track) {
        res.status(404).json({
          error: "No track found",
        });
        return next();
      }
      await prisma.trackPlay.create({
        data: {
          trackId: track.id,
          ...(user ? { userId: user.id } : { ip: req.ip }),
        },
      });
      res.sendStatus(200);
      return;
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Registers a track play",
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
        description: "A zip file of tracks",
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
