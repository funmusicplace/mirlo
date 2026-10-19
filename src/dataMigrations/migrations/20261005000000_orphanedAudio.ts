import prisma from "@mirlo/prisma";
import { difference } from "lodash";

import type { DataMigration } from "..";
import logger from "../../logger";
import { forEachStoredAudioIdPage, removeAudioFiles } from "../../utils/minio";

const orphanedAudio: DataMigration = {
  name: "2026-10-orphaned-audio",
  run: async () => {
    let removed = 0;
    let failed = 0;
    await forEachStoredAudioIdPage(async (audioIds) => {
      const existing = await prisma.trackAudio.findMany({
        where: { id: { in: audioIds } },
        select: { id: true },
      });
      const orphans = difference(
        audioIds,
        existing.map((audio) => audio.id)
      );
      for (const audioId of orphans) {
        try {
          await removeAudioFiles(audioId);
          removed += 1;
        } catch (e) {
          logger.error(`dataMigrations: couldn't remove audio ${audioId}`, e);
          failed += 1;
        }
      }
    });
    logger.info(
      `dataMigrations: removed ${removed} orphaned audio files, ${failed} failed`
    );
    return failed === 0;
  },
};

export default orphanedAudio;
