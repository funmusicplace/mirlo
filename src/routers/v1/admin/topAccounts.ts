import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";

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
    WHERE t."createdAt" >= NOW() - ${Prisma.raw(`INTERVAL '1 ${period}'`)}
      AND t."paymentStatus" != 'FAILED'
      AND t.amount > 0
  )
`;

const topSellers = (period: Period) =>
  prisma.$queryRaw<TopSeller[]>`
    WITH ${transactionsInPeriod(period)},
    sellers AS (
      SELECT DISTINCT ON (links.tx_id) links.tx_id, links."profileId"
      FROM (
        SELECT x."userTransactionId" AS tx_id, tg."profileId"
        FROM "UserTrackGroupPurchase" x
        JOIN "TrackGroup" tg ON tg.id = x."trackGroupId"
        UNION ALL
        SELECT x."transactionId", tg."profileId"
        FROM "UserTrackPurchase" x
        JOIN "Track" tr ON tr.id = x."trackId"
        JOIN "TrackGroup" tg ON tg.id = tr."trackGroupId"
        UNION ALL
        SELECT x."transactionId", m."profileId"
        FROM "MerchPurchase" x
        JOIN "Merch" m ON m.id = x."merchId"
        UNION ALL
        SELECT x."transactionId", x."profileId"
        FROM "UserProfileTip" x
        UNION ALL
        SELECT x."transactionId", st."profileId"
        FROM "ProfileUserSubscriptionCharge" x
        JOIN "ProfileUserSubscription" s ON s.id = x."profileUserSubscriptionId"
        JOIN "ProfileSubscriptionTier" st ON st.id = s."profileSubscriptionTierId"
        UNION ALL
        SELECT x."associatedTransactionId", tg."profileId"
        FROM "FundraiserPledge" x
        JOIN "TrackGroup" tg ON tg.id = x."trackGroupId"
      ) links
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

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const period: Period = req.query.period === "year" ? "year" : "month";

      const [sellers, purchasers] = await Promise.all([
        topSellers(period),
        topPurchasers(period),
      ]);

      res.json({ result: { period, sellers, purchasers } });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: `Returns the top ${LIMIT} sellers and purchasers by USD revenue`,
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
        description: "Top sellers (artists) and purchasers (users)",
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
