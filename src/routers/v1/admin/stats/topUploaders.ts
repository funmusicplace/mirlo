import { Prisma } from "@mirlo/prisma/client";

import {
  artistCsvColumns,
  topArtists,
  uploadCounts,
} from "../../../../utils/adminArtistStats";
import { adminRankingRoute } from "../../../../utils/adminStats";

export default adminRankingRoute({
  summary: "Ranks artists by tracks uploaded over the period",
  filename: "top-uploaders",
  rows: (query) =>
    topArtists(
      Prisma.sql`
        SELECT "profileId", "tracksUploaded" AS score
        FROM (${uploadCounts(query.period)}) u
      `,
      query
    ),
  csvColumns: (currency) =>
    artistCsvColumns(currency, { includeUploads: true }),
});
