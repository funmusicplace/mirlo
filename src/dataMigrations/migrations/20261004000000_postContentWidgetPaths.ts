import prisma from "@mirlo/prisma";

import type { DataMigration } from "..";
import logger from "../../logger";
import { ownWidgetOrigins, stripWidgetHosts } from "../../utils/postContent";

const batchSize = 100;

const postContentWidgetPaths: DataMigration = {
  name: "2026-10-post-content-widget-paths",
  run: async () => {
    const origins = await ownWidgetOrigins();
    let lastId = 0;
    let updated = 0;
    for (;;) {
      const posts = await prisma.post.findMany({
        where: { id: { gt: lastId }, content: { contains: "/widget/" } },
        select: { id: true, content: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: batchSize,
      });
      if (posts.length === 0) {
        break;
      }
      for (const post of posts) {
        const content = stripWidgetHosts(post.content ?? "", origins);
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
    logger.info(
      `dataMigrations: made widget urls relative in ${updated} posts`
    );
    return true;
  },
};

export default postContentWidgetPaths;
