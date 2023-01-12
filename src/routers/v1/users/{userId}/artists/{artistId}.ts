import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

type Params = {
  artistId: number;
  userId: number;
};

export default function () {
  const operations = {
    PUT,
    GET,
    DELETE,
  };

  async function PUT(req: Request, res: Response) {
    const { userId, artistId } = req.params as unknown as Params;
    const { bio, name } = req.body;

    try {
      const artist = await prisma.artist.updateMany({
        where: {
          id: Number(artistId),
          userId: Number(userId),
        },
        data: {
          bio,
          name,
        },
      });
      res.json(artist);
    } catch (error) {
      res.json({
        error: `Artist with ID ${artistId} does not exist for user ${userId}`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates an artist belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "artist",
        schema: {
          $ref: "#/definitions/Artist",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated artist",
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

  async function GET(req: Request, res: Response) {
    const { userId, artistId } = req.params as unknown as Params;
    if (userId) {
      const artist = await prisma.artist.findMany({
        where: {
          id: Number(artistId),
          userId: Number(userId),
        },
      });
      res.json(artist);
    } else {
      res.status(400);
      res.json({
        error: "Invalid route",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns artist information that belongs to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "artistId",
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

  async function DELETE(req: Request, res: Response) {
    const { userId, artistId } = req.params as unknown as Params;
    const artist = await prisma.artist.deleteMany({
      where: {
        id: Number(artistId),
        userId: Number(userId),
      },
    });
    res.json({ message: "Success" });
  }

  DELETE.apiDoc = {
    summary: "Deletes an Artist belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "artistId",
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

  return operations;
}
