import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export default function () {
  const operations = {
    PUT,
    DELETE,
  };

  async function PUT(req: Request, res: Response) {
    const { userId, trackGroupId } = req.params;

    try {
      // TODO: filter trackGroup by userId
      const post = await prisma.trackGroup.update({
        where: { id: Number(trackGroupId) },
        data: {},
      });

      res.json(post);
    } catch (error) {
      res.json({
        error: `TrackGroup with ID ${trackGroupId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated trackgroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
    const { id } = req.params;
    // FIXME: ensure trackGroup is owned by user
    const post = await prisma.trackGroup.delete({
      where: {
        id: Number(id),
      },
    });
    res.json(post);
  }

  DELETE.apiDoc = {
    summary: "Deletes a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
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
