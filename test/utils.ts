import prisma from "../prisma/prisma";

export const clearTables = async () => {
  await prisma.$executeRaw`DELETE FROM "ArtistUserSubscription";`;
  await prisma.$executeRaw`DELETE FROM "ArtistSubscriptionTier";`;
  await prisma.$executeRaw`DELETE FROM "Post";`;
  await prisma.$executeRaw`DELETE FROM "Artist";`;
  await prisma.$executeRaw`DELETE FROM "User";`;
};
