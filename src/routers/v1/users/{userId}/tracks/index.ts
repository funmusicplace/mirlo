import { Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";

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

  // FIXME: only allow creation of tracks belonging to a user
  async function POST(req: Request, res: Response) {
    const { title, trackGroupId } = req.body;
    try {
      const track = await prisma.track.create({
        data: {
          title,
          trackGroup: {
            connect: {
              id: Number(trackGroupId),
            },
          },
        },
      });
      res.json({ track });
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
