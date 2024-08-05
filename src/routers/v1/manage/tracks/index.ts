import { NextFunction, Request, Response } from "express";
import { User } from "@mirlo/prisma/client";

import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { doesTrackGroupBelongToUser } from "../../../../utils/ownership";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, POST],
  };

  async function GET(req: Request, res: Response) {
    const loggedInUser = req.user as User;

    const tracks = await prisma.track.findMany({
      where: {
        trackGroup: {
          artist: {
            userId: loggedInUser.id,
          },
        },
      },
    });
    res.json(tracks);
  }

  GET.apiDoc = {
    summary: "Returns all tracks belonging to a user",
    parameters: [],
    responses: {
      200: {
        description: "A list of tracks",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Track",
          },
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

  async function POST(req: Request, res: Response, next: NextFunction) {
    const loggedInUser = req.user as User;

    const { title, trackGroupId, trackArtists, order, metadata, isPreview } =
      req.body;
    try {
      await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        Number(loggedInUser.id)
      );

      const createdTrack = await prisma.track.create({
        data: {
          title,
          order,
          isPreview,
          metadata: metadata,
          trackGroup: {
            connect: {
              id: Number(trackGroupId),
            },
          },
          trackArtists: {
            create: trackArtists,
          },
        },
      });
      const track = await prisma.track.findFirst({
        where: {
          id: createdTrack.id,
        },
        include: {
          trackGroup: true,
          trackArtists: true,
        },
      });
      res.json({ result: track });
    } catch (e) {
      next(e);
    }
  }

  // FIXME: document POST

  return operations;
}
