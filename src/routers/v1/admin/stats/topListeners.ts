import prisma from "@mirlo/prisma";

import {
  adminRankingRoute,
  isoDate,
  since,
} from "../../../../utils/adminStats";

type TopListenerRow = {
  id: number;
  name: string | null;
  email: string;
  createdAt: Date;
  playCount: number;
  trackCount: number;
  artistCount: number;
};

export default adminRankingRoute({
  summary: "Ranks logged-in users by plays over the period",
  filename: "top-listeners",
  rows: ({ period, limit }) =>
    prisma.$queryRaw<TopListenerRow[]>`
      SELECT
        u.id,
        u.name,
        u.email,
        u."createdAt",
        COUNT(tp.id)::int AS "playCount",
        COUNT(DISTINCT tp."trackId")::int AS "trackCount",
        COUNT(DISTINCT tg."profileId")::int AS "artistCount"
      FROM "TrackPlay" tp
      JOIN "User" u ON u.id = tp."userId"
      JOIN "Track" tr ON tr.id = tp."trackId"
      JOIN "TrackGroup" tg ON tg.id = tr."trackGroupId"
      WHERE tp."createdAt" >= ${since(period)}
      GROUP BY u.id
      ORDER BY "playCount" DESC, u.id
      LIMIT ${limit}
    `,
  csvColumns: () => [
    { label: "Email", value: "email" },
    { label: "Name", value: (row) => row.name ?? "" },
    { label: "Created", value: (row) => isoDate(row.createdAt) },
    { label: "Plays", value: "playCount" },
    { label: "Unique tracks", value: "trackCount" },
    { label: "Unique artists", value: "artistCount" },
  ],
});
