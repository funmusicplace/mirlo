import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { processSingleArtist } from "../../../utils/artist";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30; // default to 30 days if not provided

      const userSignups = await prisma.$queryRaw<
        Array<{ date: string; count: number }>
      >`
        SELECT
          DATE("createdAt") AS date,
          COUNT(*) AS count
        FROM "User"
        WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;

      const trackPurchasesByDay = await prisma.$queryRaw<
        Array<{ date: string; count: number }>
      >`
        SELECT
          DATE("datePurchased") AS date,
          COUNT(*) AS count
        FROM "UserTrackPurchase"
        WHERE "datePurchased" >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE("datePurchased")
        ORDER BY date ASC
      `;

      const trackGroupPurchaseByDay = await prisma.$queryRaw<
        Array<{ date: string; count: number }>
      >`
        SELECT
          DATE("datePurchased") AS date,
          COUNT(*) AS count
        FROM "UserTrackGroupPurchase"
        WHERE "datePurchased" >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE("datePurchased")
        ORDER BY date ASC
      `;

      const userArtistTipsByDay = await prisma.$queryRaw<
        Array<{ date: string; count: number }>
      >`
        SELECT
          DATE("datePurchased") AS date,
          COUNT(*) AS count
        FROM "UserArtistTip"
        WHERE "datePurchased" >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE("datePurchased")
        ORDER BY date ASC
      `;

      const userMerchPurchase = await prisma.$queryRaw<
        Array<{ date: string; count: number }>
      >`
        SELECT
          DATE("createdAt") AS date,
          COUNT(*) AS count
        FROM "UserMerchPurchase"
        WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;

      res.json({
        userSignups,
        userArtistTipsByDay,
        trackGroupPurchaseByDay,
        trackPurchasesByDay,
        userMerchPurchase,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all artists",
    responses: {
      200: {
        description: "A list of artists",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Artist",
          },
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
