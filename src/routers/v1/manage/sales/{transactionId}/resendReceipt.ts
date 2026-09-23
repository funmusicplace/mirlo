import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import { resolveManagedArtistIds } from "../../../../../utils/artist";
import { AppError } from "../../../../../utils/error";
import {
  sendPurchaseReceipt,
  transactionsForEmails,
} from "../../../../../utils/handleFinishedTransactions";

type Params = {
  transactionId: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  /**
   * Re-sends the receipt for a sale to whoever made it, for when the original
   * never arrived (#2286). Only the buyer hears about it — the artist doesn't
   * get a second "you made a sale" notification.
   */
  async function POST(req: Request, res: Response, next: NextFunction) {
    const { transactionId } = req.params as unknown as Params;

    assertLoggedIn(req);
    const user = req.user;

    try {
      const [transaction] = await transactionsForEmails([transactionId]);

      if (!transaction) {
        throw new AppError({
          httpCode: 404,
          description: "Sale not found",
        });
      }

      // A transaction can carry releases, tracks, merch or a tip; whichever it
      // is, the receipt is sent on behalf of the artist that was paid.
      const artistId =
        transaction.trackGroupPurchases?.[0]?.trackGroup?.profile?.id ??
        transaction.trackPurchases?.[0]?.track?.trackGroup?.profile?.id ??
        transaction.merchPurchases?.[0]?.merch?.profile?.id ??
        transaction.tips?.[0]?.profile?.id;

      if (!artistId) {
        throw new AppError({
          httpCode: 404,
          description: "Couldn't work out which artist this sale belongs to",
        });
      }

      if (!user.isAdmin) {
        const managedArtistIds = await resolveManagedArtistIds(user.id, [
          artistId,
        ]);

        if (!managedArtistIds.includes(artistId)) {
          throw new AppError({
            httpCode: 401,
            description: "This sale doesn't belong to an artist you manage",
          });
        }
      }

      // The profile nested on the transaction only carries a slice of its
      // user, and the receipt template needs the whole thing.
      const artistProfile = await prisma.profile.findFirst({
        where: { id: artistId },
        include: { user: true },
      });

      if (!artistProfile) {
        throw new AppError({
          httpCode: 404,
          description: "Artist not found",
        });
      }

      const purchaser = await prisma.user.findFirst({
        where: { id: transaction.userId },
      });

      if (!purchaser) {
        throw new AppError({
          httpCode: 404,
          description: "The buyer of this sale no longer has an account",
        });
      }

      await sendPurchaseReceipt(artistProfile, purchaser, [transaction]);

      res.status(200).json({ result: { sentTo: purchaser.email } });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Re-sends the receipt for a sale to the person who bought it",
    parameters: [
      {
        in: "path",
        name: "transactionId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "The email address the receipt was sent to",
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
