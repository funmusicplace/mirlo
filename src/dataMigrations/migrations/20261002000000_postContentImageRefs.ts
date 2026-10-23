import prisma from "@mirlo/prisma";

import type { DataMigration } from "..";
import logger from "../../logger";
import { addImageRefs } from "../../utils/postContent";

const batchSize = 100;

const postContentImageRefs: DataMigration = {
  name: "2026-10-post-content-image-refs",
  run: async () => {
    let lastId = 0;
    let updated = 0;
    for (;;) {
      const posts = await prisma.post.findMany({
        where: { id: { gt: lastId }, content: { contains: "<img" } },
        select: {
          id: true,
          content: true,
          updatedAt: true,
          images: { select: { imageId: true } },
        },
        orderBy: { id: "asc" },
        take: batchSize,
      });
      if (posts.length === 0) {
        break;
      }
      for (const post of posts) {
        const content = addImageRefs(
          post.content ?? "",
          post.images.map((image) => image.imageId)
        );
        if (content !== post.content) {
          const { count } = await prisma.post.updateMany({
            where: { id: post.id, updatedAt: post.updatedAt },
            data: { content, updatedAt: post.updatedAt },
          });
          updated += count;
        }
      }
      lastId = posts[posts.length - 1].id;
    }
    logger.info(`dataMigrations: added image ids to ${updated} posts`);
    return true;
  },
};

export default postContentImageRefs;
