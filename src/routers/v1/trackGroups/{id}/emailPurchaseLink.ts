import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { userOrAppAuthenticated } from "../../../../auth/passport";
import { sendMailQueue } from "../../../../queues/send-mail-queue";
import { processSingleTrackGroup } from "../../../../serializers/trackGroup";
import { AppError } from "../../../../utils/error";
import { getClient } from "../../../../utils/getClient";
import { trackGroupArtistsInclude } from "../../../../utils/releaseArtists";
import { whereForPurchasableTrackGroup } from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    POST: [userOrAppAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { email } = req.user as User;

    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
          ...whereForPurchasableTrackGroup(),
        },
        include: {
          profile: true,
          trackGroupArtists: trackGroupArtistsInclude,
        },
      });

      if (!trackGroup) {
        throw new AppError({ httpCode: 404, description: "Album not found" });
      }
      await sendMailQueue.add("send-mail", {
        template: "album-purchase-link",
        message: {
          to: email,
        },
        locals: {
          trackGroup: processSingleTrackGroup(trackGroup),
          client: (await getClient()).applicationUrl,
        },
      });
      res.status(200).json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary:
      "Sends an email to the user containing a link to the album's purchase page",
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
        description: "A link to the album page",
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
