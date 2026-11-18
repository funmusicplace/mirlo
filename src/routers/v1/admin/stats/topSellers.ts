import { Prisma } from "@mirlo/prisma/client";

import {
  artistCsvColumns,
  sellerSales,
  topArtists,
} from "../../../../utils/adminArtistStats";
import { adminRankingRoute } from "../../../../utils/adminStats";

export default adminRankingRoute({
  summary:
    "Ranks artists by revenue in the instance's default currency over the period",
  filename: "top-sellers",
  rows: (query) =>
    topArtists(
      Prisma.sql`
        SELECT "profileId", "revenueCents" AS score
        FROM (${sellerSales(query.period, query.currency)}) s
      `,
      query
    ),
  csvColumns: (currency) => artistCsvColumns(currency),
});
