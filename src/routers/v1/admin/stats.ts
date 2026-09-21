import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";

/**
 * The x-axis of every chart on the admin dashboard. Postgres buckets weeks to
 * the Monday of the ISO week, and months to the 1st.
 */
type Granularity = "week" | "month";

const DEFAULT_DAYS = 90;

/**
 * Tables the dashboard counts rows of. Listed as literals because the table
 * name has to be interpolated into the query rather than bound.
 */
type CountableTable = "User" | "Profile";

type CountRow = { date: string; count: number };

/**
 * Failed charges aren't volume and aren't revenue. `PENDING` is deliberately
 * left in: `paymentStatus` was added in Jan 2026 without a backfill, so every
 * transaction older than that still carries the `PENDING` default.
 */
const notFailed = (alias: string) =>
  Prisma.raw(`${alias}."paymentStatus" != 'FAILED'`);

/**
 * The start of the oldest bucket. Everything measures from here rather than
 * from `NOW() - days` so the first bucket is whole, not a partial week/month.
 */
const windowStart = (granularity: Granularity, days: number) =>
  Prisma.sql`DATE_TRUNC(${granularity}, NOW() - (${days} * INTERVAL '1 day'))`;

/**
 * One row per bucket in the window, so quiet weeks/months come back as a zero
 * instead of a gap in the chart.
 *
 * `INTERVAL` can't take a bound parameter, so the unit is interpolated - safe
 * only because `granularity` is narrowed to one of two literals first.
 */
const bucketSeries = (granularity: Granularity, days: number) => Prisma.sql`
  buckets AS (
    SELECT GENERATE_SERIES(
      ${windowStart(granularity, days)},
      DATE_TRUNC(${granularity}, NOW()),
      ${Prisma.raw(`INTERVAL '1 ${granularity}'`)}
    ) AS bucket_start
  )
`;

const bucketDate = Prisma.sql`TO_CHAR(buckets.bucket_start, 'YYYY-MM-DD') AS "date"`;

/** Rows of `table` created in each bucket. */
const countPerBucket = (
  table: CountableTable,
  granularity: Granularity,
  days: number
) =>
  prisma.$queryRaw<CountRow[]>`
    WITH ${bucketSeries(granularity, days)}
    SELECT
      ${bucketDate},
      COUNT(t."createdAt")::int AS count
    FROM buckets
    LEFT JOIN ${Prisma.raw(`"${table}"`)} t
      ON DATE_TRUNC(${granularity}, t."createdAt") = buckets.bucket_start
    GROUP BY buckets.bucket_start
    ORDER BY buckets.bucket_start ASC
  `;

/**
 * The average of the last 12 monthly totals, e.g. "plays per month".
 */
const avgPerMonth = async (
  table: Prisma.Sql,
  countExpression: Prisma.Sql,
  extraFilter: Prisma.Sql = Prisma.empty
) => {
  const [row] = await prisma.$queryRaw<Array<{ average: number }>>`
    SELECT ROUND(AVG(monthly_count))::int AS average
    FROM (
      SELECT
        DATE_TRUNC('month', "createdAt") AS month,
        ${countExpression}::int AS monthly_count
      FROM ${table}
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        ${extraFilter}
      GROUP BY month
    ) monthly
  `;

  return row?.average ?? 0;
};

/**
 * Every money figure the dashboard charts, in one pass over the transactions.
 *
 * `amount`/`currency` are presentment values, so USD charges are summed
 * directly while foreign charges are counted through the frozen
 * `platformCurrencyAmount`/`exchangeRate` reporting fields.
 */
const revenuePerBucket = (granularity: Granularity, days: number) =>
  prisma.$queryRaw<
    Array<{
      date: string;
      purchasesUsdCents: number;
      subscriptionsUsdCents: number;
      purchasesConvertedUsdCents: number;
      subscriptionsConvertedUsdCents: number;
      platformCutUsdCents: number;
      platformCutConvertedUsdCents: number;
    }>
  >`
    WITH ${bucketSeries(granularity, days)},
    tx AS (
      SELECT
        t."createdAt",
        t.currency,
        t.amount,
        t."platformCut",
        t."platformCurrency",
        t."platformCurrencyAmount",
        t."exchangeRate",
        EXISTS (
          SELECT 1 FROM "ProfileUserSubscriptionCharge" c
          WHERE c."transactionId" = t.id
        ) AS "isSubscription",
        -- Foreign charges only count once they were settled into USD.
        (t.currency != 'usd' AND t."platformCurrency" = 'usd') AS "isUsdConverted"
      FROM "UserTransaction" t
      WHERE t."createdAt" >= ${windowStart(granularity, days)}
        AND ${notFailed("t")}
    )
    SELECT
      ${bucketDate},
      COALESCE(SUM(CASE WHEN tx.currency = 'usd' AND NOT tx."isSubscription" THEN tx.amount END), 0)::double precision AS "purchasesUsdCents",
      COALESCE(SUM(CASE WHEN tx.currency = 'usd' AND tx."isSubscription" THEN tx.amount END), 0)::double precision AS "subscriptionsUsdCents",
      COALESCE(SUM(CASE WHEN tx."isUsdConverted" AND NOT tx."isSubscription" THEN tx."platformCurrencyAmount" END), 0)::double precision AS "purchasesConvertedUsdCents",
      COALESCE(SUM(CASE WHEN tx."isUsdConverted" AND tx."isSubscription" THEN tx."platformCurrencyAmount" END), 0)::double precision AS "subscriptionsConvertedUsdCents",
      COALESCE(SUM(CASE WHEN tx.currency = 'usd' THEN tx."platformCut" END), 0)::double precision AS "platformCutUsdCents",
      COALESCE(SUM(CASE WHEN tx."isUsdConverted" THEN ROUND(tx."platformCut" * tx."exchangeRate") END), 0)::double precision AS "platformCutConvertedUsdCents"
    FROM buckets
    LEFT JOIN tx ON DATE_TRUNC(${granularity}, tx."createdAt") = buckets.bucket_start
    GROUP BY buckets.bucket_start
    ORDER BY buckets.bucket_start ASC
  `;

/**
 * Transaction counts split by presentment currency. Stacked, these add up to
 * the total transaction count for the bucket.
 */
const transactionCountsPerBucket = (granularity: Granularity, days: number) =>
  prisma.$queryRaw<Array<{ date: string; currency: string; count: number }>>`
    WITH ${bucketSeries(granularity, days)},
    currencies AS (
      SELECT DISTINCT t.currency
      FROM "UserTransaction" t
      WHERE t."createdAt" >= ${windowStart(granularity, days)}
        AND ${notFailed("t")}
    )
    SELECT
      ${bucketDate},
      currencies.currency AS currency,
      COUNT(t.id)::int AS count
    FROM buckets
    CROSS JOIN currencies
    LEFT JOIN "UserTransaction" t
      ON DATE_TRUNC(${granularity}, t."createdAt") = buckets.bucket_start
      AND t.currency = currencies.currency
      AND ${notFailed("t")}
    GROUP BY buckets.bucket_start, currencies.currency
    ORDER BY currencies.currency ASC, buckets.bucket_start ASC
  `;

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedDays = parseInt(req.query.days as string, 10);
      const days =
        Number.isFinite(parsedDays) && parsedDays > 0
          ? parsedDays
          : DEFAULT_DAYS;
      const granularity: Granularity =
        req.query.granularity === "month" ? "month" : "week";

      const [
        userSignups,
        artistSignups,
        revenue,
        transactionCounts,
        avgMonthlyPlays,
        avgMonthlyActiveUsers,
        avgMonthlyAlbumDownloads,
      ] = await Promise.all([
        countPerBucket("User", granularity, days),
        countPerBucket("Profile", granularity, days),
        revenuePerBucket(granularity, days),
        transactionCountsPerBucket(granularity, days),
        avgPerMonth(Prisma.sql`"TrackPlay"`, Prisma.sql`COUNT(*)`),
        avgPerMonth(
          Prisma.sql`"TrackPlay"`,
          Prisma.sql`COUNT(DISTINCT "userId")`,
          Prisma.sql`AND "userId" IS NOT NULL`
        ),
        avgPerMonth(Prisma.sql`"TrackGroupDownload"`, Prisma.sql`COUNT(*)`),
      ]);

      res.json({
        result: {
          granularity,
          userSignups,
          artistSignups,
          revenue,
          transactionCounts,
          avgMonthlyPlays,
          avgMonthlyActiveUsers,
          avgMonthlyAlbumDownloads,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns platform-wide stats for the admin dashboard",
    parameters: [
      {
        in: "query",
        name: "days",
        type: "string",
        required: false,
        description: `How far back to report on. Defaults to ${DEFAULT_DAYS}.`,
      },
      {
        in: "query",
        name: "granularity",
        type: "string",
        enum: ["week", "month"],
        required: false,
        description: "Bucket size for the time series. Defaults to week.",
      },
    ],
    responses: {
      200: {
        description: "Time series and averages for the admin dashboard",
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
