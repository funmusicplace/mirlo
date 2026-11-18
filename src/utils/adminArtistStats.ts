import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

import {
  CsvColumn,
  isoDate,
  majorUnits,
  Period,
  since,
  transactionSellers,
} from "./adminStats";

export type TopArtistRow = {
  id: number;
  name: string;
  urlSlug: string;
  email: string;
  createdAt: Date;
  location: string | null;
  label: string | null;
  albumCount: number;
  trackCount: number;
  merchCount: number;
  tierCount: number;
  albumDownloads: number;
  freeDownloads: number;
  revenueCents: number;
  salesCount: number;
  albumsUploaded: number;
  tracksUploaded: number;
};

export const sellerSales = (period: Period, currency: string) => Prisma.sql`
  SELECT
    s."profileId",
    SUM(s."cents")::double precision AS "revenueCents",
    COUNT(s.id)::int AS "salesCount"
  FROM (${transactionSellers(period, currency)}) s
  WHERE s."profileId" IS NOT NULL
  GROUP BY s."profileId"
`;

// A free download is a release or track acquired without paying: no
// transaction (free albums, download codes) or a $0 pay-what-you-want one.
// Releases granted through subscriptions or merch (`proGratis`) don't count.
export const freeDownloadCounts = (period: Period) => Prisma.sql`
  SELECT d."profileId", COUNT(*)::int AS "freeDownloads"
  FROM (
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
  ) d
  GROUP BY d."profileId"
`;

export const uploadCounts = (period: Period) => Prisma.sql`
  SELECT
    tg."profileId",
    COUNT(tr.id)::int AS "tracksUploaded",
    COUNT(DISTINCT tg.id)::int AS "albumsUploaded"
  FROM "Track" tr
  JOIN "TrackGroup" tg ON tg.id = tr."trackGroupId"
  WHERE tr."createdAt" >= ${since(period)}
    AND tr."deletedAt" IS NULL
    AND tg."deletedAt" IS NULL
  GROUP BY tg."profileId"
`;

// Counts every logged album download, paid or free, so repeat downloads by
// the same listener count each time.
const albumDownloadCounts = (period: Period) => Prisma.sql`
  SELECT tg."profileId", COUNT(d.id)::int AS "albumDownloads"
  FROM "TrackGroupDownload" d
  JOIN "TrackGroup" tg ON tg.id = d."trackGroupId"
  WHERE d."createdAt" >= ${since(period)}
    AND tg."deletedAt" IS NULL
  GROUP BY tg."profileId"
`;

/**
 * `scores` selects `"profileId", score` for every artist in the period; the
 * top `limit` by score come back with every column the dashboard exports.
 */
export const topArtists = (
  scores: Prisma.Sql,
  {
    period,
    currency,
    limit,
  }: { period: Period; currency: string; limit: number }
) =>
  prisma.$queryRaw<TopArtistRow[]>`
    SELECT
      p.id,
      p.name,
      p."urlSlug",
      u.email,
      p."createdAt",
      p.location,
      labels.names AS label,
      (
        SELECT COUNT(*)::int FROM "TrackGroup" tg
        WHERE tg."profileId" = p.id AND tg."deletedAt" IS NULL
      ) AS "albumCount",
      (
        SELECT COUNT(*)::int FROM "Track" tr
        JOIN "TrackGroup" tg ON tg.id = tr."trackGroupId"
        WHERE tg."profileId" = p.id
          AND tg."deletedAt" IS NULL
          AND tr."deletedAt" IS NULL
      ) AS "trackCount",
      (
        SELECT COUNT(*)::int FROM "Merch" m
        WHERE m."profileId" = p.id AND m."deletedAt" IS NULL
      ) AS "merchCount",
      (
        SELECT COUNT(*)::int FROM "ProfileSubscriptionTier" st
        WHERE st."profileId" = p.id
          AND st."deletedAt" IS NULL
          AND st."isDefaultTier" = false
      ) AS "tierCount",
      COALESCE(downloads."albumDownloads", 0) AS "albumDownloads",
      COALESCE(free."freeDownloads", 0) AS "freeDownloads",
      COALESCE(sales."revenueCents", 0) AS "revenueCents",
      COALESCE(sales."salesCount", 0) AS "salesCount",
      COALESCE(uploads."albumsUploaded", 0) AS "albumsUploaded",
      COALESCE(uploads."tracksUploaded", 0) AS "tracksUploaded"
    FROM (
      ${scores}
      ORDER BY score DESC, "profileId"
      LIMIT ${limit}
    ) ranked
    JOIN "Profile" p ON p.id = ranked."profileId"
    JOIN "User" u ON u.id = p."userId"
    LEFT JOIN (${sellerSales(period, currency)}) sales
      ON sales."profileId" = p.id
    LEFT JOIN (${freeDownloadCounts(period)}) free ON free."profileId" = p.id
    LEFT JOIN (${albumDownloadCounts(period)}) downloads
      ON downloads."profileId" = p.id
    LEFT JOIN (${uploadCounts(period)}) uploads ON uploads."profileId" = p.id
    LEFT JOIN LATERAL (
      SELECT string_agg(DISTINCT COALESCE(lp.name, lu.name), ', ') AS names
      FROM "ArtistLabel" al
      JOIN "User" lu ON lu.id = al."labelUserId"
      LEFT JOIN "Profile" lp
        ON lp."userId" = al."labelUserId"
        AND lp."isLabelProfile" = true
        AND lp."deletedAt" IS NULL
      WHERE al."artistId" = p.id
        AND al."isLabelApproved" = true
        AND al."isArtistApproved" = true
    ) labels ON true
    ORDER BY ranked.score DESC, p.id
  `;

export const artistCsvColumns = (
  currency: string,
  { includeUploads = false } = {}
): CsvColumn<TopArtistRow>[] => [
  { label: "Artist", value: "name" },
  { label: "Email", value: "email" },
  { label: "Created", value: (row) => isoDate(row.createdAt) },
  { label: "Label", value: (row) => row.label ?? "" },
  { label: "Location", value: (row) => row.location ?? "" },
  { label: "Albums", value: "albumCount" },
  { label: "Tracks", value: "trackCount" },
  { label: "Merch items", value: "merchCount" },
  { label: "Tiers", value: "tierCount" },
  ...(includeUploads
    ? [
        {
          label: "Albums uploaded in period",
          value: "albumsUploaded" as const,
        },
        {
          label: "Tracks uploaded in period",
          value: "tracksUploaded" as const,
        },
      ]
    : []),
  { label: "Album downloads", value: "albumDownloads" },
  { label: "Free downloads", value: "freeDownloads" },
  {
    label: `Revenue (${currency.toUpperCase()})`,
    value: (row) => majorUnits(row.revenueCents),
  },
  { label: "Sales", value: "salesCount" },
];
