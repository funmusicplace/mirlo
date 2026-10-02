import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { transactionSellerLinks } from "../../../utils/transactionSellers";

type Period = "month" | "year";

const LIMIT = 50;

type TopSeller = {
  id: number;
  name: string;
  urlSlug: string;
  usdCents: number;
  transactionCount: number;
};

type TopPurchaser = {
  id: number;
  name: string | null;
  email: string;
  usdCents: number;
  transactionCount: number;
};

type TopFreeDownloadArtist = {
  id: number;
  name: string;
  urlSlug: string;
  downloadCount: number;
};

type TopUploader = {
  id: number;
  name: string;
  urlSlug: string;
  trackCount: number;
  trackGroupCount: number;
};

type TopDownloadedAlbum = {
  id: number;
  title: string | null;
  artistId: number;
  artistName: string;
  downloadCount: number;
};

const since = (period: Period) =>
  Prisma.sql`NOW() - ${Prisma.raw(`INTERVAL '1 ${period}'`)}`;

const transactionsInPeriod = (period: Period) => Prisma.sql`
  tx AS (
    SELECT
      t.id,
      t."userId",
      CASE
        WHEN t.currency = 'usd' THEN t.amount
        WHEN t."platformCurrency" = 'usd' THEN t."platformCurrencyAmount"
      END AS "usdCents"
    FROM "UserTransaction" t
    WHERE t."createdAt" >= ${since(period)}
      AND t."paymentStatus" != 'FAILED'
      AND t.amount > 0
  )
`;

const topSellers = (period: Period) =>
  prisma.$queryRaw<TopSeller[]>`
    WITH ${transactionsInPeriod(period)},
    sellers AS (
      SELECT DISTINCT ON (links.tx_id) links.tx_id, links."profileId"
      FROM (${transactionSellerLinks}) links
      JOIN tx ON tx.id = links.tx_id
    )
    SELECT
      p.id,
      p.name,
      p."urlSlug",
      SUM(tx."usdCents")::double precision AS "usdCents",
      COUNT(tx.id)::int AS "transactionCount"
    FROM tx
    JOIN sellers ON sellers.tx_id = tx.id
    JOIN "Profile" p ON p.id = sellers."profileId"
    WHERE tx."usdCents" IS NOT NULL
    GROUP BY p.id
    ORDER BY "usdCents" DESC
    LIMIT ${LIMIT}
  `;

const topPurchasers = (period: Period) =>
  prisma.$queryRaw<TopPurchaser[]>`
    WITH ${transactionsInPeriod(period)}
    SELECT
      u.id,
      u.name,
      u.email,
      SUM(tx."usdCents")::double precision AS "usdCents",
      COUNT(tx.id)::int AS "transactionCount"
    FROM tx
    JOIN "User" u ON u.id = tx."userId"
    WHERE tx."usdCents" IS NOT NULL
    GROUP BY u.id
    ORDER BY "usdCents" DESC
    LIMIT ${LIMIT}
  `;

// A free download is a release or track acquired without paying: no
// transaction (free albums, download codes) or a $0 pay-what-you-want one.
// Releases granted through subscriptions or merch (`proGratis`) don't count.
const topFreeDownloads = (period: Period) =>
  prisma.$queryRaw<TopFreeDownloadArtist[]>`
    WITH downloads AS (
      SELECT tg."profileId"
      FROM "UserTrackGroupPurchase" x
      JOIN "TrackGroup" tg ON tg.id = x."trackGroupId"
      LEFT JOIN "UserTransaction" t ON t.id = x."userTransactionId"
      WHERE x."createdAt" >= ${since(period)}
        AND x."proGratis" = false
        AND (t.id IS NULL OR t.amount = 0)
      UNION ALL
      SELECT tg."profileId"
      FROM "UserTrackPurchase" x
      JOIN "Track" tr ON tr.id = x."trackId"
      JOIN "TrackGroup" tg ON tg.id = tr."trackGroupId"
      LEFT JOIN "UserTransaction" t ON t.id = x."transactionId"
      WHERE x."datePurchased" >= ${since(period)}
        AND (t.id IS NULL OR t.amount = 0)
    )
    SELECT
      p.id,
      p.name,
      p."urlSlug",
      COUNT(*)::int AS "downloadCount"
    FROM downloads
    JOIN "Profile" p ON p.id = downloads."profileId"
    GROUP BY p.id
    ORDER BY "downloadCount" DESC
    LIMIT ${LIMIT}
  `;

const topUploaders = (period: Period) =>
  prisma.$queryRaw<TopUploader[]>`
    SELECT
      p.id,
      p.name,
      p."urlSlug",
      COUNT(tr.id)::int AS "trackCount",
      COUNT(DISTINCT tg.id)::int AS "trackGroupCount"
    FROM "Track" tr
    JOIN "TrackGroup" tg ON tg.id = tr."trackGroupId"
    JOIN "Profile" p ON p.id = tg."profileId"
    WHERE tr."createdAt" >= ${since(period)}
      AND tr."deletedAt" IS NULL
      AND tg."deletedAt" IS NULL
    GROUP BY p.id
    ORDER BY "trackCount" DESC
    LIMIT ${LIMIT}
  `;

// Counts every logged album download, paid or free, so repeat downloads by
// the same listener count each time.
const topDownloadedAlbums = (period: Period) =>
  prisma.$queryRaw<TopDownloadedAlbum[]>`
    SELECT
      tg.id,
      tg.title,
      p.id AS "artistId",
      p.name AS "artistName",
      COUNT(d.id)::int AS "downloadCount"
    FROM "TrackGroupDownload" d
    JOIN "TrackGroup" tg ON tg.id = d."trackGroupId"
    JOIN "Profile" p ON p.id = tg."profileId"
    WHERE d."createdAt" >= ${since(period)}
      AND tg."deletedAt" IS NULL
    GROUP BY tg.id, p.id
    ORDER BY "downloadCount" DESC
    LIMIT ${LIMIT}
  `;

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const period: Period = req.query.period === "year" ? "year" : "month";

      const [sellers, purchasers, freeDownloads, uploaders, downloadedAlbums] =
        await Promise.all([
          topSellers(period),
          topPurchasers(period),
          topFreeDownloads(period),
          topUploaders(period),
          topDownloadedAlbums(period),
        ]);

      res.json({
        result: {
          period,
          sellers,
          purchasers,
          freeDownloads,
          uploaders,
          downloadedAlbums,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: `Returns the top ${LIMIT} sellers and purchasers by USD revenue, the top ${LIMIT} artists by free downloads and by tracks uploaded, and the top ${LIMIT} most downloaded albums`,
    parameters: [
      {
        in: "query",
        name: "period",
        type: "string",
        enum: ["month", "year"],
        required: false,
        description: "How far back to look. Defaults to month.",
      },
    ],
    responses: {
      200: {
        description:
          "Top sellers (artists), purchasers (users), free-download artists, uploaders (artists) and most downloaded albums",
        schema: {
          type: "object",
          additionalProperties: true,
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
