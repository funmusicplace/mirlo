import prisma from "@mirlo/prisma";

export const findCataloguePurchasableTrackGroups = async (profile: {
  id: number;
  userId: number;
}) => {
  return prisma.trackGroup.findMany({
    where: {
      profileId: profile.id,
      OR: [{ paymentToUserId: null }, { paymentToUserId: profile.userId }],
      releaseDate: { lte: new Date() },
      isHiddenTrackGroupForSongDrafts: false,
      publishedAt: { lte: new Date() },
      isGettable: true,
      adminEnabled: true,
    },
    include: {
      profile: true,
    },
  });
};

export const calculateCatalogueFloorPrice = async (profile: {
  id: number;
  userId: number;
  purchaseEntireCatalogMinPrice: number;
  purchaseEntireCatalogPercentage: number | null;
}) => {
  if (profile.purchaseEntireCatalogPercentage == null) {
    return profile.purchaseEntireCatalogMinPrice;
  }
  const trackGroups = await findCataloguePurchasableTrackGroups(profile);
  const total = trackGroups.reduce((sum, tg) => sum + (tg.minPrice ?? 0), 0);
  return Math.round((profile.purchaseEntireCatalogPercentage / 100) * total);
};
