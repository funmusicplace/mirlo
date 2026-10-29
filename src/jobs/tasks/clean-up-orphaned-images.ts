import prisma from "@mirlo/prisma";

import logger from "../../logger";
import { deleteStoredImage } from "../../utils/images";

export const ORPHANED_IMAGE_GRACE_HOURS = 24;

const cleanUpOrphanedImages = async () => {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - ORPHANED_IMAGE_GRACE_HOURS);

  const orphans = await prisma.image.findMany({
    where: {
      createdAt: { lt: cutoff },
      tiers: { none: {} },
      merchImage: { is: null },
      backgroundOf: { is: null },
      avatarOf: { is: null },
      postImage: { is: null },
      featuredForPost: { none: {} },
      coverOf: { is: null },
      splashOf: { is: null },
      pendingFor: { is: null },
    },
    select: { id: true, keyPrefix: true },
  });

  for (const image of orphans) {
    await deleteStoredImage(image);
  }

  logger.info(
    `cleanUpOrphanedImages: deleted ${orphans.length} unlinked images older than ${ORPHANED_IMAGE_GRACE_HOURS} hours`
  );
};

export default cleanUpOrphanedImages;
