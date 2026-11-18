import prisma from "@mirlo/prisma";

import {
  adminRankingRoute,
  isoDate,
  majorUnits,
  periodTransactions,
  since,
} from "../../../../utils/adminStats";

type TopAlbumRow = {
  id: number;
  title: string | null;
  releaseDate: Date | null;
  artistId: number;
  artistName: string;
  artistEmail: string;
  downloadCount: number;
  revenueCents: number;
  salesCount: number;
};

// Counts every logged album download, paid or free, so repeat downloads by
// the same listener count each time. Revenue includes the album's tracks
// bought on their own.
export default adminRankingRoute({
  summary: "Ranks albums by logged downloads over the period",
  filename: "top-albums",
  rows: ({ period, currency, limit }) =>
    prisma.$queryRaw<TopAlbumRow[]>`
      SELECT
        tg.id,
        tg.title,
        tg."releaseDate",
        p.id AS "artistId",
        p.name AS "artistName",
        u.email AS "artistEmail",
        ranked."downloadCount",
        COALESCE(sales."revenueCents", 0) AS "revenueCents",
        COALESCE(sales."salesCount", 0) AS "salesCount"
      FROM (
        SELECT d."trackGroupId", COUNT(d.id)::int AS "downloadCount"
        FROM "TrackGroupDownload" d
        JOIN "TrackGroup" tg ON tg.id = d."trackGroupId"
        WHERE d."createdAt" >= ${since(period)}
          AND tg."deletedAt" IS NULL
        GROUP BY d."trackGroupId"
        ORDER BY "downloadCount" DESC, d."trackGroupId"
        LIMIT ${limit}
      ) ranked
      JOIN "TrackGroup" tg ON tg.id = ranked."trackGroupId"
      JOIN "Profile" p ON p.id = tg."profileId"
      JOIN "User" u ON u.id = p."userId"
      LEFT JOIN (
        SELECT
          items."trackGroupId",
          SUM(tx."cents")::double precision AS "revenueCents",
          COUNT(tx.id)::int AS "salesCount"
        FROM (
          SELECT x."trackGroupId", x."userTransactionId" AS tx_id
          FROM "UserTrackGroupPurchase" x
          UNION
          SELECT tr."trackGroupId", x."transactionId"
          FROM "UserTrackPurchase" x
          JOIN "Track" tr ON tr.id = x."trackId"
        ) items
        JOIN (${periodTransactions(period, currency)}) tx
          ON tx.id = items.tx_id
        GROUP BY items."trackGroupId"
      ) sales ON sales."trackGroupId" = tg.id
      ORDER BY ranked."downloadCount" DESC, tg.id
    `,
  csvColumns: (currency) => [
    { label: "Album", value: (row) => row.title ?? "" },
    { label: "Artist", value: "artistName" },
    { label: "Artist email", value: "artistEmail" },
    { label: "Release date", value: (row) => isoDate(row.releaseDate) },
    { label: "Downloads", value: "downloadCount" },
    {
      label: `Revenue (${currency.toUpperCase()})`,
      value: (row) => majorUnits(row.revenueCents),
    },
    { label: "Sales", value: "salesCount" },
  ],
});
