import prisma from "@mirlo/prisma";

import {
  adminRankingRoute,
  isoDate,
  majorUnits,
  transactionSellers,
} from "../../../../utils/adminStats";

type TopPurchaserRow = {
  id: number;
  name: string | null;
  email: string;
  createdAt: Date;
  cents: number;
  transactionCount: number;
  artistCount: number;
};

export default adminRankingRoute({
  summary:
    "Ranks users by spending in the instance's default currency over the period",
  filename: "top-purchasers",
  rows: ({ period, currency, limit }) =>
    prisma.$queryRaw<TopPurchaserRow[]>`
      SELECT
        u.id,
        u.name,
        u.email,
        u."createdAt",
        SUM(s."cents")::double precision AS "cents",
        COUNT(s.id)::int AS "transactionCount",
        COUNT(DISTINCT s."profileId")::int AS "artistCount"
      FROM (${transactionSellers(period, currency)}) s
      JOIN "User" u ON u.id = s."userId"
      GROUP BY u.id
      ORDER BY "cents" DESC, u.id
      LIMIT ${limit}
    `,
  csvColumns: (currency) => [
    { label: "Email", value: "email" },
    { label: "Name", value: (row) => row.name ?? "" },
    { label: "Created", value: (row) => isoDate(row.createdAt) },
    {
      label: `Spent (${currency.toUpperCase()})`,
      value: (row) => majorUnits(row.cents),
    },
    { label: "Transactions", value: "transactionCount" },
    { label: "Artists bought from", value: "artistCount" },
  ],
});
