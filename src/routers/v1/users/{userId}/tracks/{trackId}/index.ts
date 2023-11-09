import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../../utils/ownership";
import prisma from "../../../../../../../prisma/prisma";
import {
  finalAudioBucket,
  getObjectList,
  incomingAudioBucket,
  minioClient,
} from "../../../../../../utils/minio";
import { deleteTrack } from "../../../../../../utils/tracks";

interface TrackBody {
  title: string;
  isPreview: boolean;
  trackArtists: {
    artistName: string;
    id: string;
    artistId: number;
    role: string;
  }[];
}

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
    DELETE: [userAuthenticated, userHasPermission("owner"), DELETE],
    GET,
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

      const newTrack = await prisma.track.update({
        where: { id: Number(trackId) },
        data: {
          title: title,
          isPreview: isPreview,
        },
      });

      const currentTrackArtists = await prisma.trackArtist.findMany({
        where: {
          trackId: Number(trackId),
        },
      });

      let trackArtistIds = trackArtists.map((ta) => ta.id);

      const newTrackArtists = trackArtists.filter((ta) => !ta.id);
      const existingTrackArtists = trackArtists.filter((ta) => ta.id);
      const oldTrackArtists = currentTrackArtists.filter(
        (ta) => !trackArtistIds.includes(ta.id)
      );

      await prisma.trackArtist.createMany({
        data: newTrackArtists.map((nta) => ({
          trackId: Number(trackId),
          artistId: nta.artistId,
          artistName: nta.artistName,
          role: nta.role,
        })),
      });

      await Promise.all(
        existingTrackArtists.map((eta) =>
          prisma.trackArtist.update({
            where: {
              id: eta.id,
            },
            data: {
              artistId: eta.artistId,
              artistName: eta.artistName,
              role: eta.role,
            },
          })
        )
      );

      await prisma.trackArtist.deleteMany({
        where: {
          id: {
            in: oldTrackArtists.map((ota) => ota.id),
          },
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
