import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

export const contentFlagInclude = {
  profile: {
    select: { id: true, name: true, urlSlug: true, enabled: true },
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
} satisfies Prisma.ContentFlagInclude;

export const findFlaggedImageOwner = async (
  imageModel: string,
  imageId: string
): Promise<{ profileId?: number; trackGroupId?: number }> => {
  switch (imageModel) {
    case "trackGroupCover": {
      const cover = await prisma.trackGroupCover.findUnique({
        where: { id: imageId },
        select: {
          trackGroupId: true,
          trackGroup: { select: { profileId: true } },
        },
      });
      return {
        trackGroupId: cover?.trackGroupId,
        profileId: cover?.trackGroup.profileId,
      };
    }
    case "artistAvatar": {
      const avatar = await prisma.profileAvatar.findUnique({
        where: { id: imageId },
        select: { profileId: true },
      });
      return { profileId: avatar?.profileId };
    }
    case "artistBackground": {
      const background = await prisma.profileBackground.findUnique({
        where: { id: imageId },
        select: { profileId: true },
      });
      return { profileId: background?.profileId };
    }
    case "postImage": {
      const image = await prisma.postImage.findUnique({
        where: { id: imageId },
        select: { post: { select: { profileId: true } } },
      });
      return { profileId: image?.post.profileId ?? undefined };
    }
    case "merchImage": {
      const image = await prisma.merchImage.findUnique({
        where: { id: imageId },
        select: { merch: { select: { profileId: true } } },
      });
      return { profileId: image?.merch.profileId };
    }
    default:
      return {};
  }
};
