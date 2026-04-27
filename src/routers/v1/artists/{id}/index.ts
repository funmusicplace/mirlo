import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import {
  checkIsUserSubscriber,
  findArtistIdForURLSlug,
  processSingleArtist,
  singleInclude,
} from "../../../../utils/artist";
export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const { includeDefaultTier }: { includeDefaultTier?: boolean } = req.query;
    const loggedInUser = req.user;
    if (!id || id === "undefined") {
      return res.status(400).json({ error: "Invalid artist ID" });
    }
    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let isUserSubscriber = false;
      if (parsedId) {
        const artist = await prisma.artist.findFirst({
          where: {
            id: parsedId,
            enabled: true,
          },
          include: singleInclude({ includeDefaultTier }) as any,
        });

        isUserSubscriber = await checkIsUserSubscriber(loggedInUser, parsedId);

        if (!artist) {
          return res.status(404).json({ error: "Artist not found" });
        }

        if (artist.isLabelProfile) {
          const user = await prisma.user.findUnique({
            where: {
              id: artist.userId,
              isLabelAccount: true,
            },
            select: {
              artistLabels: true,
            },
          });
        }

        return res.json({
          result: processSingleArtist(
            artist as any,
            loggedInUser?.id,
            isUserSubscriber
          ),
        });
      } else {
        return res.status(404).json({ error: "Artist not found" });
      }
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
