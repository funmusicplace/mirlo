import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../../utils/ownership";
import prisma from "../../../../../../../prisma/prisma";

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
    DELETE: [userAuthenticated, userHasPermission("owner"), DELETE],
    GET,
  };

  // FIXME: only allow updating of tracks owned by userId
  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackId, userId } = req.params;
    try {
      const track = await doesTrackBelongToUser(
        Number(trackId),
        Number(userId)
      );

      if (!track) {
        res.status(400).json({
          error: "Track must belong to user",
        });
        return next();
      }

      const newTrack = await prisma.track.update({
        where: { id: Number(trackId) },
        data: {
          title: req.body.title,
        },
      });

      res.json({ result: newTrack });
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { userId, trackId } = req.params;

    const track = await doesTrackBelongToUser(Number(trackId), Number(userId));

    if (!track) {
      res.status(400).json({
        error: "Track must belong to user",
      });
      return next();
    }

    await prisma.track.delete({
      where: {
        id: Number(trackId),
      },
    });

    res.json({ message: "Success" });
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

    const track = await prisma.track.findUnique({
      where: { id: Number(trackId) },
    });
    res.json({ result: track });
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
