import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../../utils/ownership";
import prisma from "../../../../../../../prisma/prisma";

import {
  deleteTrack,
  updateTrackArtists,
} from "../../../../../../utils/tracks";

interface TrackBody {
  title: string;
  isPreview: boolean;
  trackArtists?: {
    artistName: string;
    id: string;
    artistId: number;
    role: string;
    isCoAuthor: boolean;
  }[];
}

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
    DELETE: [userAuthenticated, userHasPermission("owner"), DELETE],
    GET: [userAuthenticated, userHasPermission("owner"), GET],
  };

  // FIXME: only allow updating of tracks owned by userId
  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackId, userId } = req.params;
    const { title, isPreview, trackArtists } = req.body as TrackBody;
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

      await updateTrackArtists(Number(trackId), trackArtists);

      const newTrack = await prisma.track.update({
        where: { id: Number(trackId) },
        data: {
          title: title,
          isPreview: isPreview,
        },
        include: {
          trackArtists: true,
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
    const { userId, trackId: trackIdString } = req.params;

    const trackId = Number(trackIdString);
    const track = await doesTrackBelongToUser(trackId, Number(userId));
    if (!track) {
      res.status(400).json({
        error: "Track must belong to user",
      });
      return next();
    }

    try {
      await deleteTrack(trackId);

      res.json({ message: "Success" });
    } catch (e) {
      console.error("DELETE /users/{userId}/tracks/{trackId", e);
      res.status(500).json({ error: e });
    }
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

  async function GET(req: Request, res: Response) {
    const { trackId } = req.params;

    const track = await prisma.track.findUnique({
      where: { id: Number(trackId) },
      include: {
        audio: true,
      },
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
