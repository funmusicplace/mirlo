import { NextFunction, Request, Response } from "express";
import {
  trackBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../utils/ownership";
import prisma from "@mirlo/prisma";

import { deleteTrack, updateTrackArtists } from "../../../../../utils/tracks";
import { User } from "@mirlo/prisma/client";
import { AppError } from "../../../../../utils/error";

interface TrackBody {
  title: string;
  isPreview: boolean;
  licenseId: number;
  lyrics: string;
  isrc: string;
  minPrice: number;
  allowIndividualSale: boolean;
  allowMirloPromo: boolean;
  description: string;
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
    PUT: [userAuthenticated, trackBelongsToLoggedInUser, PUT],
    DELETE: [userAuthenticated, trackBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, trackBelongsToLoggedInUser, GET],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackId } = req.params;
    const {
      title,
      isPreview,
      trackArtists,
      licenseId,
      minPrice,
      allowIndividualSale,
      lyrics,
      isrc,
      description,
      allowMirloPromo,
    } = req.body as TrackBody;

    try {
      await updateTrackArtists(Number(trackId), trackArtists);

      const newTrack = await prisma.track.update({
        where: { id: Number(trackId) },
        data: {
          title: title,
          lyrics,
          isrc,
          isPreview,
          allowIndividualSale,
          minPrice,
          licenseId: Number(licenseId),
          description,
          allowMirloPromo,
        },
        include: {
          trackArtists: true,
        },
      });

      res.json({ result: newTrack });
    } catch (error) {
      console.error(error);
      next(error);
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
    const { trackId: trackIdString } = req.params;
    const loggedInUser = req.user as User;

    const trackId = Number(trackIdString);
    const track = await doesTrackBelongToUser(trackId, loggedInUser);
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
      next(e);
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
