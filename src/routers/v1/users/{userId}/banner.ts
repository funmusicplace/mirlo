import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { processUserBanner } from "../../../../queues/processImages";
import { busboyOptions } from "../../../../utils/images";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, busboy(busboyOptions), PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      const { jobId, imageId } = await processUserBanner({ req, res })(
        loggedInUser.id
      );

      res.json({ result: { jobId, imageId } });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a banner for a user",
    parameters: [
      {
        in: "path",
        name: "userId",
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
        description: "Updated User",
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
