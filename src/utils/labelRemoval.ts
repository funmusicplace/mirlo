import prisma from "@mirlo/prisma";

import { AppError } from "./error";

const payeeName = async (userId: number) => {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      name: true,
      profiles: {
        where: { isLabelProfile: true },
        select: { name: true },
        take: 1,
      },
    },
  });
  return user?.profiles[0]?.name ?? user?.name ?? "";
};

export const labelRemovalImpact = async (
  artistId: number,
  labelUserId: number
) => {
  const relationship = await prisma.artistLabel.findFirst({
    where: { artistId, labelUserId },
    select: {
      artist: { select: { name: true, userId: true, paymentToUserId: true } },
      labelUser: { select: { stripeAccountId: true } },
    },
  });
  if (!relationship) {
    throw new AppError({ httpCode: 404, description: "Label not found" });
  }
  const { artist, labelUser } = relationship;

  const isArtistPayee = artist.paymentToUserId === labelUserId;
  const trackGroups = await prisma.trackGroup.findMany({
    where: {
      profileId: artistId,
      OR: [
        { paymentToUserId: labelUserId },
        ...(isArtistPayee ? [{ paymentToUserId: null }] : []),
      ],
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const activeSubscriptionCount = labelUser.stripeAccountId
    ? await prisma.profileUserSubscription.count({
        where: {
          stripeAccountId: labelUser.stripeAccountId,
          stripeSubscriptionKey: { not: null },
          profileSubscriptionTier: { profileId: artistId },
        },
      })
    : 0;

  const newPayeeUserId =
    (!isArtistPayee && artist.paymentToUserId) || artist.userId;

  return {
    trackGroups,
    isArtistPayee,
    activeSubscriptionCount,
    newPayeeName:
      newPayeeUserId === artist.userId
        ? artist.name
        : await payeeName(newPayeeUserId),
  };
};

export const removeLabelFromArtist = (artistId: number, labelUserId: number) =>
  prisma.$transaction([
    prisma.artistLabel.deleteMany({ where: { artistId, labelUserId } }),
    prisma.trackGroup.updateMany({
      where: { profileId: artistId, paymentToUserId: labelUserId },
      data: { paymentToUserId: null },
    }),
    prisma.profile.updateMany({
      where: { id: artistId, paymentToUserId: labelUserId },
      data: { paymentToUserId: null },
    }),
  ]);
