import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { confirmProfileIdExists } from "../../../../utils/artist";
import { redeemDownloadCode } from "../../../../utils/redeemCode";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [confirmProfileIdExists, userLoggedInWithoutRedirect, POST],
  };

  /**
   * Redeems a code against any release by this artist, so an artist can hand
   * out one `/artistname/redeem` address rather than one per release (#577).
   */
  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: profileId } = req.params as unknown as Params;
    const { email: notLoggedInUserEmail, code } = req.body as {
      code: string;
      email: string;
    };

    try {
      const { trackGroup, purchase } = await redeemDownloadCode({
        code,
        scope: { profileId: Number(profileId) },
        userId: req.user?.id,
        email: notLoggedInUserEmail,
      });

      // The caller doesn't know which release the code was for, so tell it.
      return res.status(200).json({
        ...purchase,
        trackGroup: {
          id: trackGroup.id,
          urlSlug: trackGroup.urlSlug,
          title: trackGroup.title,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Redeems a download code for any release by this artist",
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
        description:
          "The purchase created for the redeemed code, and the release it was for",
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
