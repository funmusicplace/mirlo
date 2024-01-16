import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userLoggedInWithoutRedirect,
} from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import sendMail from "../../../../jobs/send-mail";
import { randomUUID } from "crypto";

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { email: notLoggedInUserEmail } = req.query;

    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          artist: true,
          tracks: {
            include: {
              audio: true,
            },
            where: {
              deletedAt: null,
            },
          },
        },
      });

      if (!trackGroup) {
        res.status(404);
        return next();
      }

      if (trackGroup.minPrice !== 0 && trackGroup.minPrice !== null) {
        res.status(400).json({
          error: "This trackGroup can't be gotten for free",
        });
        return next();
      }

      if (req.user) {
        const { id: userId, email } = req.user as User;

        const purchaseExists = await prisma.userTrackGroupPurchase.findFirst({
          where: {
            userId,
            trackGroupId: Number(trackGroupId),
          },
        });

        if (purchaseExists) {
          res.status(400).json({
            error: "User already owns this trackGroup!",
          });
          return next();
        }

        const purchase = await prisma.userTrackGroupPurchase.create({
          data: {
            userId: userId,
            trackGroupId: Number(trackGroupId),
            pricePaid: 0,
            singleDownloadToken: randomUUID(),
          },
        });

        sendMail({
          data: {
            template: "album-free-download",
            message: {
              to: email,
            },
            locals: {
              trackGroup,
              email,
              host: process.env.API_DOMAIN,
              client: process.env.REACT_APP_CLIENT_DOMAIN,
              token: purchase.singleDownloadToken,
            },
          },
        });
        res.status(200).json({ message: "success" });
      } else {
        res.status(500).json({
          error: "downloading without logging in hasn't been implemented yet",
        });
      }
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Sends an email to the user to download a free trackGroup file",
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
        description: "A zip file of trackgroup tracks",
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
