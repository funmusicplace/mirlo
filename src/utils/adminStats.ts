import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../auth/passport";

import { downloadCSVFile } from "./download";
import { AppError } from "./error";
import { getSiteSettings, resolveDefaultCurrency } from "./settings";
import { transactionSellerLinks } from "./transactionSellers";

export const PERIODS = { month: "1 month", year: "1 year" } as const;

export type Period = keyof typeof PERIODS;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

const isPeriod = (value: string): value is Period => value in PERIODS;

export const parseRankingQuery = (query: Request["query"]) => {
  const period = String(query.period ?? "month");
  if (!isPeriod(period)) {
    throw new AppError({
      httpCode: 400,
      description: `period must be one of ${Object.keys(PERIODS).join(", ")}`,
    });
  }

  const limit = query.limit === undefined ? DEFAULT_LIMIT : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new AppError({
      httpCode: 400,
      description: `limit must be a whole number from 1 to ${MAX_LIMIT}`,
    });
  }

  return { period, limit };
};

export const since = (period: Period) =>
  Prisma.sql`NOW() - ${PERIODS[period]}::interval`;

export const periodTransactions = (
  period: Period,
  currency: string
) => Prisma.sql`
  SELECT * FROM (
    SELECT
      t.id,
      t."userId",
      CASE
        WHEN t.currency = ${currency} THEN t.amount
        WHEN t."platformCurrency" = ${currency} THEN t."platformCurrencyAmount"
      END AS "cents"
    FROM "UserTransaction" t
    WHERE t."createdAt" >= ${since(period)}
      AND t."paymentStatus" != 'FAILED'
      AND t.amount > 0
  ) t
  WHERE t."cents" IS NOT NULL
`;

export const transactionSellers = (
  period: Period,
  currency: string
) => Prisma.sql`
  SELECT DISTINCT ON (tx.id) tx.id, tx."userId", tx."cents", links."profileId"
  FROM (${periodTransactions(period, currency)}) tx
  LEFT JOIN (${transactionSellerLinks}) links ON links.tx_id = tx.id
`;

export const isoDate = (date: Date | null) =>
  date ? new Date(date).toISOString().slice(0, 10) : "";

export const majorUnits = (cents: number) => (cents / 100).toFixed(2);

export type CsvColumn<Row> = {
  label: string;
  value: (keyof Row & string) | ((row: Row) => unknown);
};

export const adminRankingRoute =
  <Row>(options: {
    summary: string;
    filename: string;
    rows: (query: {
      period: Period;
      limit: number;
      currency: string;
    }) => Promise<Row[]>;
    csvColumns: (currency: string) => CsvColumn<Row>[];
  }) =>
  () => {
    const operations = {
      GET: [userAuthenticated, userHasPermission("admin"), GET],
    };

    async function GET(req: Request, res: Response, next: NextFunction) {
      try {
        const { period, limit } = parseRankingQuery(req.query);
        const currency = resolveDefaultCurrency(await getSiteSettings());
        const rows = await options.rows({ period, limit, currency });

        if (req.query.format === "csv") {
          return downloadCSVFile(
            res,
            `${options.filename}-${period}.csv`,
            options.csvColumns(currency),
            rows
          );
        }

        res.json({ result: { period, currency, rows } });
      } catch (e) {
        next(e);
      }
    }

    GET.apiDoc = {
      summary: options.summary,
      parameters: [
        {
          in: "query",
          name: "period",
          type: "string",
          enum: Object.keys(PERIODS),
          required: false,
          description: "How far back to look. Defaults to month.",
        },
        {
          in: "query",
          name: "limit",
          type: "string",
          required: false,
          description: `How many rows to return. Defaults to ${DEFAULT_LIMIT}.`,
        },
        {
          in: "query",
          name: "format",
          type: "string",
          enum: ["csv"],
          required: false,
          description: "Return the rows as a CSV file instead of JSON",
        },
      ],
      responses: {
        200: {
          description: "The ranked rows, with the period and currency used",
          schema: { type: "object", additionalProperties: true },
        },
        default: {
          description: "An error occurred",
          schema: { additionalProperties: true },
        },
      },
    };

    return operations;
  };
