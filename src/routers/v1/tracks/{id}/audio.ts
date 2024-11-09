import { NextFunction, Request, Response } from "express";

import prisma from "@mirlo/prisma";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { fetchFile } from "./stream/{segment}";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string; segment?: string } = req.params;

    try {
      const track = await prisma.trackAudio.findUnique({
        where: { id: id },
        include: {
          track: true,
        },
      });

      if (!track) {
        res.status(404);
        return next();
      }

      if (track) {
        await fetchFile(res, track.id, "original.flac");
      }
    } catch (e) {
      console.error(e);
      res.status(500);
      return next();
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
