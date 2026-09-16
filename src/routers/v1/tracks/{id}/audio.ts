import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { whereForVisibleTrackGroup } from "../../../../utils/trackGroup";

import { fetchFile } from "./stream/{segment}";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string; segment?: string } = req.params;
    const loggedInUser = req.user;

    try {
      if (!id) {
        throw new AppError({
          httpCode: 400,
          description: "Missing track identifier",
        });
      }

      if (!uuidValidate(id)) {
        throw new AppError({
          httpCode: 400,
          description: "Invalid track identifier",
        });
      }

      const track = await prisma.trackAudio.findFirst({
        where: {
          id,
          ...(loggedInUser?.isAdmin
            ? {}
            : { track: { trackGroup: whereForVisibleTrackGroup() } }),
        },
        include: {
          track: true,
        },
      });

      if (!track) {
        throw new AppError({
          httpCode: 404,
          description: "Track not found",
        });
      }

      if (track) {
        await fetchFile(res, track.id, "original.flac");
      }
    } catch (e) {
      return next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns track streaming playlist",
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
        description: "A track that matches the id",
        schema: {
          $ref: "#/definitions/Track",
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
