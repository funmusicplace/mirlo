import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedDays = parseInt(req.query.days as string, 10);
      const days =
        Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 90;

      const userSignupsByWeek = await prisma.$queryRaw<
        Array<{ week: string; count: number }>
      >`
        WITH weeks AS (
          SELECT GENERATE_SERIES(
            DATE_TRUNC('week', NOW() - (${days} * INTERVAL '1 day')),
            DATE_TRUNC('week', NOW()),
            INTERVAL '1 week'
          ) AS week_start
        )
        SELECT
          TO_CHAR(weeks.week_start, 'YYYY-MM-DD') AS week,
          COUNT(u."createdAt")::int AS count
        FROM weeks
        LEFT JOIN "User" u
          ON DATE_TRUNC('week', u."createdAt") = weeks.week_start
        GROUP BY weeks.week_start
        ORDER BY weeks.week_start ASC
      `;

      const artistSignupsByWeek = await prisma.$queryRaw<
        Array<{ week: string; count: number }>
      >`
        WITH weeks AS (
          SELECT GENERATE_SERIES(
            DATE_TRUNC('week', NOW() - (${days} * INTERVAL '1 day')),
            DATE_TRUNC('week', NOW()),
            INTERVAL '1 week'
          ) AS week_start
        )
        SELECT
          TO_CHAR(weeks.week_start, 'YYYY-MM-DD') AS week,
          COUNT(a."createdAt")::int AS count
        FROM weeks
        LEFT JOIN "Artist" a
          ON DATE_TRUNC('week', a."createdAt") = weeks.week_start
        GROUP BY weeks.week_start
        ORDER BY weeks.week_start ASC
      `;

      const transactionsByWeek = await prisma.$queryRaw<
        Array<{ week: string; count: number }>
      >`
        WITH weeks AS (
          SELECT GENERATE_SERIES(
            DATE_TRUNC('week', NOW() - (${days} * INTERVAL '1 day')),
            DATE_TRUNC('week', NOW()),
            INTERVAL '1 week'
          ) AS week_start
        )
        SELECT
          TO_CHAR(weeks.week_start, 'YYYY-MM-DD') AS week,
          COUNT(t."createdAt")::int AS count
        FROM weeks
        LEFT JOIN "UserTransaction" t
          ON DATE_TRUNC('week', t."createdAt") = weeks.week_start
        GROUP BY weeks.week_start
        ORDER BY weeks.week_start ASC
      `;

      const transactionAmountByWeek = await prisma.$queryRaw<
        Array<{ week: string; currency: string; totalAmountCents: number }>
      >`
        WITH weeks AS (
          SELECT GENERATE_SERIES(
            DATE_TRUNC('week', NOW() - (${days} * INTERVAL '1 day')),
            DATE_TRUNC('week', NOW()),
            INTERVAL '1 week'
          ) AS week_start
        ),
        currencies AS (
          SELECT DISTINCT t.currency
          FROM "UserTransaction" t
          WHERE t."createdAt" >= NOW() - (${days} * INTERVAL '1 day')
        )
        SELECT
          TO_CHAR(weeks.week_start, 'YYYY-MM-DD') AS week,
          currencies.currency AS currency,
          COALESCE(SUM(t.amount), 0)::double precision AS "totalAmountCents"
        FROM weeks
        CROSS JOIN currencies
        LEFT JOIN "UserTransaction" t
          ON DATE_TRUNC('week', t."createdAt") = weeks.week_start
          AND t.currency = currencies.currency
        GROUP BY weeks.week_start, currencies.currency
        ORDER BY currencies.currency ASC, weeks.week_start ASC
      `;

      res.json({
        result: {
          userSignupsByWeek,
          artistSignupsByWeek,
          transactionsByWeek,
          transactionAmountByWeek,
        },
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
