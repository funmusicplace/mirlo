import prisma from "@mirlo/prisma";

import type { DataMigration } from "../";
import logger from "../../logger";

const approveSelfOwnedLabelRows: DataMigration = {
  name: "2026-10-approve-self-owned-label-rows",
  run: async () => {
    const rows = await prisma.artistLabel.findMany({
      where: {
        OR: [{ isArtistApproved: false }, { isLabelApproved: false }],
      },
      select: {
        artistId: true,
        labelUserId: true,
        artist: { select: { userId: true } },
      },
    });
    const selfOwned = rows.filter(
      (row) => row.artist.userId === row.labelUserId
    );
    for (const row of selfOwned) {
      await prisma.artistLabel.update({
        where: {
          labelUserId_artistId: {
            labelUserId: row.labelUserId,
            artistId: row.artistId,
          },
        },
        data: { isArtistApproved: true, isLabelApproved: true },
      });
    }
    logger.info(
      `dataMigrations: approved ${selfOwned.length} label rows on profiles the label owns`
    );
    return true;
  },
};

export default approveSelfOwnedLabelRows;
