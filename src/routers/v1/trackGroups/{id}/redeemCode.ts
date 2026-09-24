import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { redeemDownloadCode } from "../../../../utils/redeemCode";

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { email: notLoggedInUserEmail, code } = req.body as {
      code: string;
      email: string;
    };

    try {
      const { purchase } = await redeemDownloadCode({
        code,
        scope: { trackGroupId: Number(trackGroupId) },
        userId: req.user?.id,
        email: notLoggedInUserEmail,
      });

      return res.status(200).json(purchase);
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Redeems a download code for a specific release",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "The purchase created for the redeemed code",
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
