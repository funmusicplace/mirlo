import prisma from "@mirlo/prisma";

import type { DataMigration } from "..";
import logger from "../../logger";
import { sanitizePostContent } from "../../utils/postContent";

const batchSize = 100;

const sanitizeExistingPostContent: DataMigration = {
  name: "2026-10-sanitize-post-content",
  run: async () => {
    let lastId = 0;
    let updated = 0;
    for (;;) {
      const posts = await prisma.post.findMany({
        where: { id: { gt: lastId }, content: { not: null } },
        select: { id: true, content: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: batchSize,
      });
      if (posts.length === 0) {
        break;
      }
      for (const post of posts) {
        const content = sanitizePostContent(post.content ?? "");
        if (content !== post.content) {
          await prisma.post.update({
            where: { id: post.id },
            data: { content, updatedAt: post.updatedAt },
          });
          updated += 1;
        }
      }
      lastId = posts[posts.length - 1].id;
    }
    logger.info(`dataMigrations: sanitized content of ${updated} posts`);
    return true;
  },
};

export default sanitizeExistingPostContent;
