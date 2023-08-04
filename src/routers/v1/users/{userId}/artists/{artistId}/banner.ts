import { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { processArtistBanner } from "../../../../../../utils/processImages";
import prisma from "../../../../../../../prisma/prisma";

const upload = multer({
  dest: process.env.MEDIA_LOCATION_INCOMING ?? "/data/media/incoming",
  limits: {
    fileSize: 10000000, // 10mb seems reasonable for a cover
  },
});

type Params = {
  artistId: string;
  userId: string;
};

const isFileArray = (entity: unknown): entity is Express.Multer.File[] => {
  return true;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      artistBelongsToLoggedInUser,
      upload.array("upload"),
      PUT,
    ],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;

    try {
      // FIXME: Only allow uploading of one file.
      if (req.files && isFileArray(req.files)) {
        await processArtistBanner({ req, res })(req.files[0], Number(artistId));
      }

      res.json({ message: "Success" });
    } catch (error) {
      console.error("Cover error", error);
      res.status(400).json({
        error: `TrackGroup with ID ${artistId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates an artist banner belonging to a user",
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
        in: "formData",
        name: "file",
        type: "file",
        required: true,
        description: "The banner to upload",
      },
    ],
    responses: {
      200: {
        description: "Updated Artist",
        schema: {
          type: "object",
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
