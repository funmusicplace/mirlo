import { NextFunction, Request, Response } from "express";
import {
  trackBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../utils/ownership";
import { updateTrackArtists } from "../../../../../utils/tracks";
import { User } from "@mirlo/prisma/client";

interface TrackBody {
  title: string;
  isPreview: boolean;
  trackArtists: {
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
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackId } = req.params as {
      trackId: string;
    };
    const loggedInUser = req.user as User;

    const { trackArtists } = req.body as TrackBody;
    try {
      const track = await doesTrackBelongToUser(
        Number(trackId),
        Number(loggedInUser.id)
      );

      if (!track) {
        res.status(400).json({
          error: "Track must belong to user",
        });
        return next();
      }

      const newTrackArtists = await updateTrackArtists(
        Number(trackId),
        trackArtists
      );

      res.json({ results: newTrackArtists });
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

  return operations;
}
