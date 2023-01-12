import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    PUT,
    DELETE,
    GET,
  };

  // FIXME: only allow updating of tracks owned by userId
  async function PUT(req: Request, res: Response) {
    const { trackId, userId } = req.params;

    try {
      const post = await prisma.track.update({
        where: { id: Number(trackId) },
        data: {},
      });

      res.json(post);
    } catch (error) {
      res.json({
        error: `Track with ID ${trackId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates a track belonging to a user",
    parameters: [
      {
        in: "path",
        name: "trackId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "track",
        schema: {
          $ref: "#/definitions/Track",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated track",
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

  // FIXME: only allow updating of tracks owned by userId
  async function DELETE(req: Request, res: Response) {
    const { userId, trackId } = req.params;
    const post = await prisma.track.delete({
      where: {
        id: Number(trackId),
      },
    });
    res.json(post);
  }

  DELETE.apiDoc = {
    summary: "Deletes a Track",
    parameters: [
      {
        in: "path",
        name: "trackId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  // FIXME: only return tracks owned by user
  async function GET(req: Request, res: Response) {
    const { trackId, userId } = req.params;

    const post = await prisma.track.findUnique({
      where: { id: Number(trackId) },
    });
    res.json(post);
  }

  GET.apiDoc = {
    summary: "Returns track information",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackId",
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
