import prisma from "@mirlo/prisma";
import { TrustLevelChangeReason } from "@mirlo/prisma/client";

export const TRUST_LEVELS = {
  NEW: 0,
  VERIFIED: 1,
  REGULAR: 2,
  TRUSTED: 3,
} as const;

export type TrustLevel = (typeof TRUST_LEVELS)[keyof typeof TRUST_LEVELS];

export const DEFAULT_TRUST_LEVEL_NAMES = [
  "New",
  "Verified",
  "Regular",
  "Trusted",
];

export const isTrustLevel = (value: unknown): value is TrustLevel =>
  Object.values(TRUST_LEVELS).includes(value as TrustLevel);

export const isTrustLevelNames = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= DEFAULT_TRUST_LEVEL_NAMES.length &&
  value.every((name) => typeof name === "string");

export const resolveTrustLevelNames = (names?: string[]) =>
  DEFAULT_TRUST_LEVEL_NAMES.map(
    (defaultName, level) => names?.[level]?.trim() || defaultName
  );

export const setUserTrustLevel = async (
  userId: number,
  toLevel: TrustLevel,
  reason: TrustLevelChangeReason,
  changedByUserId?: number
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trustLevel: true },
  });
  if (!user || user.trustLevel === toLevel) {
    return null;
  }
  const fromLevel = user.trustLevel;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, trustLevel: fromLevel },
      data: { trustLevel: toLevel },
    });
    if (updated.count === 0) {
      return null;
    }
    return tx.userTrustLevelChange.create({
      data: { userId, fromLevel, toLevel, reason, changedByUserId },
    });
  });
};
