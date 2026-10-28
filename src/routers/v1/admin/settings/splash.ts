import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { processSplashImage } from "../../../../queues/processImages";
import { busboyOptions } from "../../../../utils/images";
import { respondWithInstanceSettings } from "../../../../utils/instanceSettingsResponse";
import { deleteSplashImage } from "../../../../utils/splashScreen";

const UNAUTHORIZED_RESPONSE = {
  description: "Not logged in as an admin",
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      userHasPermission("admin"),
      busboy({
        ...busboyOptions,
        limits: { ...busboyOptions.limits, files: 1 },
      }),
      PUT,
    ],
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId, imageId } = await processSplashImage({ req, res });
      return res.status(200).json({ result: { jobId, imageId } });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Uploads the background image of the custom splash screen",
    description:
      "The image is optimized in the background. The previous splash image stays in place until the new one is ready, then the new one replaces it: poll the returned job to know when. A later upload or a removal cancels an image that is still being optimized.",
    parameters: [
      {
        in: "formData",
        name: "upload",
        type: "file",
        required: true,
        description: "The splash background image",
      },
    ],
    responses: {
      200: {
        description: "The optimize-image job and the new image id",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                jobId: { type: "string" },
                imageId: { type: "string" },
              },
            },
          },
        },
      },
      400: {
        description: "The request holds no image",
      },
      401: UNAUTHORIZED_RESPONSE,
      406: {
        description: "The file is not an image format we can read",
      },
      413: {
        description: "The image is larger than the upload limit",
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      await deleteSplashImage();
      return respondWithInstanceSettings(res);
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Removes the background image of the custom splash screen",
    description:
      "Also cancels an image that is still being optimized. Returns the public instance settings, the same object as GET /instance.",
    responses: {
      200: {
        description: "The public instance settings without a splash image",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
      401: UNAUTHORIZED_RESPONSE,
    },
  };

  return operations;
}
