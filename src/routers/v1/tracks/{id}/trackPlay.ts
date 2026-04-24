import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { AppError, HttpCode } from "../../../../utils/error";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackId }: { id?: string } = req.params;
    const user = req.user;
    const parsedTrackId = Number(trackId);

    try {
      if (!Number.isInteger(parsedTrackId) || parsedTrackId <= 0) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "Invalid track id",
        });
      }

      const track = await prisma.track.findUnique({
        where: { id: parsedTrackId },
        select: { id: true },
      });

      if (!track) {
        throw new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: "No track found",
        });
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
