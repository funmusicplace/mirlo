import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";

export default function () {
  const operations = {
    GET,
    POST: [userAuthenticated, userHasPermission("owner"), POST],
  };

  // FIXME: filter tracks to those owned by a user
  async function GET(req: Request, res: Response) {
    const tracks = await prisma.track.findMany();
    res.json(tracks);
  }

  GET.apiDoc = {
    summary: "Returns all tracks belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "number",
      },
    ],
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
    const { userId } = req.params;
    const { title, trackGroupId, trackArtists, order, metadata, isPreview } =
      req.body;
    try {
      await doesTrackGroupBelongToUser(Number(trackGroupId), Number(userId));

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
      console.error(e);
      res
        .status(500)
        .json({ error: "Something went wrong creating the trackgroup" });
    }
  }

  // FIXME: document POST

  return operations;
}
