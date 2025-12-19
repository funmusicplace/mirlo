import { NextFunction, Request, Response } from "express";
import {
  trackBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { updateTrackArtists } from "../../../../../utils/tracks";

interface TrackBody {
  title: string;
  isPreview: boolean;
  trackArtists: {
    artistName: string;
    id: string;
    artistId: number;
    role: string;
    isCoAuthor: boolean;
    order: number;
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

    const { trackArtists } = req.body as TrackBody;
    try {
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
