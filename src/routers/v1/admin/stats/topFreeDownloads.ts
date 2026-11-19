import { Prisma } from "@mirlo/prisma/client";

import {
  artistCsvColumns,
  freeDownloadCounts,
  topArtists,
} from "../../../../utils/adminArtistStats";
import { adminRankingRoute } from "../../../../utils/adminStats";

export default adminRankingRoute({
  summary: "Ranks artists by free downloads over the period",
  filename: "top-free-downloads",
  rows: (query) =>
    topArtists(
      Prisma.sql`
        SELECT "profileId", "freeDownloads" AS score
        FROM (${freeDownloadCounts(query.period)}) f
      `,
      query
    ),
  csvColumns: (currency) => artistCsvColumns(currency),
});
