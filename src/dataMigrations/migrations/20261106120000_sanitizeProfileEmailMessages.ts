import prisma from "@mirlo/prisma";
import { isEqual } from "lodash";

import type { DataMigration } from "..";
import logger from "../../logger";
import { sanitizeProfileEmailMessages } from "../../utils/postContent";

const batchSize = 100;

const sanitizeExistingProfileEmailMessages: DataMigration = {
  name: "2026-11-sanitize-profile-email-messages",
  run: async () => {
    let lastId = 0;
    let updated = 0;
    for (;;) {
      const profiles = await prisma.profile.findMany({
        where: { id: { gt: lastId } },
        select: { id: true, properties: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: batchSize,
      });
      if (profiles.length === 0) {
        break;
      }
      for (const profile of profiles) {
        const properties = sanitizeProfileEmailMessages(profile.properties);
        if (!isEqual(properties, profile.properties)) {
          await prisma.profile.update({
            where: { id: profile.id },
            data: {
              properties: properties ?? undefined,
              updatedAt: profile.updatedAt,
            },
          });
          updated += 1;
        }
      }
      lastId = profiles[profiles.length - 1].id;
    }
    logger.info(
      `dataMigrations: sanitized thank-you messages of ${updated} profiles`
    );
    return true;
  },
};

export default sanitizeExistingProfileEmailMessages;
