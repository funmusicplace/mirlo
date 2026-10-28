import prisma from "@mirlo/prisma";
import { ImageSlot } from "@mirlo/prisma/client";

import logger from "../logger";

import { deleteStoredImage } from "./images";

type Transaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type ImageSlotTarget = {
  findImageId: (
    tx: Transaction,
    ownerId: number
  ) => Promise<string | null | undefined>;
  setImageId: (
    tx: Transaction,
    ownerId: number,
    imageId: string | null
  ) => Promise<unknown>;
};

const IMAGE_SLOT_TARGETS: Record<ImageSlot, ImageSlotTarget> = {
  SPLASH: {
    findImageId: async (tx, ownerId) =>
      (
        await tx.settings.findUnique({
          where: { id: ownerId },
          select: { splashImageId: true },
        })
      )?.splashImageId,
    setImageId: (tx, ownerId, imageId) =>
      tx.settings.update({
        where: { id: ownerId },
        data: { splashImageId: imageId },
      }),
  },
};

const removeImage = async (imageId: string) => {
  const image = await prisma.image.findFirst({ where: { id: imageId } });
  if (image) {
    await deleteStoredImage(image);
  }
};

const isImageInSlot = async (tx: Transaction, imageId: string) => {
  const image = await tx.image.findUnique({
    where: { id: imageId },
    select: {
      splashOf: { select: { id: true } },
      avatarOf: { select: { id: true } },
      backgroundOf: { select: { id: true } },
      coverOf: { select: { id: true } },
    },
  });
  return Boolean(
    image?.splashOf || image?.avatarOf || image?.backgroundOf || image?.coverOf
  );
};

export const isImagePending = async (imageId: string) =>
  (await prisma.pendingImage.count({ where: { imageId } })) > 0;

export const markPendingImage = (
  slot: ImageSlot,
  ownerId: number,
  imageId: string
) =>
  prisma.pendingImage.upsert({
    where: { slot_ownerId: { slot, ownerId } },
    create: { slot, ownerId, imageId },
    update: { imageId },
  });

export const discardPendingImage = async (imageId: string) => {
  const isInSlot = await prisma.$transaction(async (tx) => {
    await tx.pendingImage.deleteMany({ where: { imageId } });
    return isImageInSlot(tx, imageId);
  });
  if (!isInSlot) {
    await removeImage(imageId);
  }
  return isInSlot;
};

export const attachPendingImage = async (imageId: string) => {
  const outcome = await prisma.$transaction(async (tx) => {
    const [pending] = await tx.$queryRaw<
      { slot: ImageSlot; ownerId: number }[]
    >`SELECT "slot", "ownerId" FROM "PendingImage" WHERE "imageId" = ${imageId}::uuid FOR UPDATE`;
    if (!pending) {
      return { isAttached: false, previousId: null };
    }
    const { findImageId, setImageId } = IMAGE_SLOT_TARGETS[pending.slot];
    const previousId = await findImageId(tx, pending.ownerId);
    await setImageId(tx, pending.ownerId, imageId);
    await tx.pendingImage.delete({ where: { imageId } });
    return { isAttached: true, previousId };
  });
  if (!outcome.isAttached) {
    return discardPendingImage(imageId);
  }
  const { previousId } = outcome;
  if (previousId && previousId !== imageId) {
    try {
      await removeImage(previousId);
    } catch (e) {
      logger.error(`Could not delete the replaced image ${previousId}`);
      logger.error(e);
    }
  }
  return true;
};

export const clearImageSlot = async (slot: ImageSlot, ownerId: number) => {
  const imageId = await prisma.$transaction(async (tx) => {
    await tx.pendingImage.deleteMany({ where: { slot, ownerId } });
    const { findImageId, setImageId } = IMAGE_SLOT_TARGETS[slot];
    const currentId = await findImageId(tx, ownerId);
    if (currentId) {
      await setImageId(tx, ownerId, null);
    }
    return currentId;
  });
  if (imageId) {
    await removeImage(imageId);
  }
};
