import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import { registerPurchase } from "../../../../utils/trackGroup";
import { findOrCreateUserBasedOnEmail } from "../../../../utils/user";
import { AppError } from "../../../../utils/error";

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

      const downloadCode = await prisma.trackGroupDownloadCodes.findFirst({
        where: {
          downloadCode: code,
          redeemedByUser: null,
        },
      });

      if (!downloadCode) {
        return next(
          new AppError({
            httpCode: 404,
            description: "Code not found",
          })
        );
      }

      const { user: purchaser } = await findOrCreateUserBasedOnEmail(
        notLoggedInUserEmail as string,
        (req.user as User)?.id
      );

      if (purchaser) {
        await prisma.trackGroupDownloadCodes.update({
          where: {
            id: downloadCode.id,
          },
          data: {
            redeemedByUserId: purchaser.id,
          },
        });
        const purchase = await registerPurchase({
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          pricePaid: 0,
          currencyPaid: "USD",
          paymentProcessorKey: null,
        });
        return res.status(200).json(purchase);
      } else {
        res.status(400).json({
          error: "Need to be either logged in or supply email address",
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
