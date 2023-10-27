import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import { doesTrackBelongToUser } from "../../../../../../utils/ownership";
import { processTrackAudio } from "../../../../../../utils/processTrackAudio";

const upload = multer({
  dest: process.env.MEDIA_LOCATION_INCOMING ?? "/data/media/incoming",
  limits: {
    fileSize: 4000000000,
  },
});

type Params = {
  trackId: string;
  userId: string;
};

const isFileArray = (entity: unknown): entity is Express.Multer.File[] => {
  return true;
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      userHasPermission("owner"),
      upload.array("upload"),
      PUT,
    ],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;
    try {
      const track = doesTrackBelongToUser(Number(trackId), loggedInUser.id);

      if (!track) {
        res.status(400).json({
          error: "Track must belong to user",
        });
        return next();
      }

      let jobId = null;
      // TODO: Remove prior files
      // FIXME: Only allow uploading of one file.
      if (req.files && isFileArray(req.files)) {
        jobId = await processTrackAudio({ req, res })(
          req.files[0],
          Number(trackId)
        );
      }

      res.json({ result: { jobId } });
    } catch (error) {
      res.status(400).json({
        error: `Track with ID ${trackId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup cover belonging to a user",
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
      {
        in: "formData",
        name: "file",
        type: "file",
        required: true,
        description: "The cover to upload",
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

  return operations;
}
