import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

export const contentFlagInclude = {
  profile: {
    select: {
      id: true,
      name: true,
      urlSlug: true,
      enabled: true,
      user: { select: { id: true, name: true, email: true, disabledAt: true } },
    },
  },
  trackGroup: {
    select: {
      id: true,
      title: true,
      urlSlug: true,
      adminEnabled: true,
      hideFromSearch: true,
    },
  },
  resolvedByUser: {
    select: { id: true, name: true, email: true },
  },
  reportedUser: {
    select: { id: true, name: true, email: true, disabledAt: true },
  },
  trustLevelChange: {
    select: { fromLevel: true, toLevel: true, createdAt: true },
  },
} satisfies Prisma.ContentFlagInclude;

export const findFlaggedImageOwner = async (
  imageModel: string,
  imageId: string
): Promise<{ profileId?: number; trackGroupId?: number }> => {
  switch (imageModel) {
    case "trackGroupCover": {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: { coverImageId: imageId },
        select: { id: true, profileId: true },
      });
      return {
        trackGroupId: trackGroup?.id,
        profileId: trackGroup?.profileId,
      };
    }
    default: {
      const image = await prisma.image.findUnique({
        where: { id: imageId },
        select: { profileId: true },
      });
      return { profileId: image?.profileId ?? undefined };
    }
  }
};
