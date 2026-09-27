import prisma from "@mirlo/prisma";
import { TrustLevelChangeReason } from "@mirlo/prisma/client";

export const TRUST_LEVELS = {
  NEW: 0,
  VERIFIED: 1,
  REGULAR: 2,
  TRUSTED: 3,
} as const;

export type TrustLevel = (typeof TRUST_LEVELS)[keyof typeof TRUST_LEVELS];

export const DEFAULT_TRUST_LEVEL_RULES = {
  PAYMENT_ACCOUNT_VERIFIED: TRUST_LEVELS.VERIFIED,
} as const satisfies Partial<Record<TrustLevelChangeReason, TrustLevel>>;

export type TrustSignal = keyof typeof DEFAULT_TRUST_LEVEL_RULES;

export type TrustPenalty = Extract<TrustLevelChangeReason, "SPAM_REPORTED">;

export const DEFAULT_TRUST_LEVEL_NAMES = [
  "New",
  "Verified",
  "Regular",
  "Trusted",
];

type TrustLevelDb = Pick<typeof prisma, "user" | "userTrustLevelChange">;

type TrustLevelChangeOptions = {
  changedByUserId?: number;
  contentFlagId?: number;
  tx?: TrustLevelDb;
};

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

const inTrustLevelTransaction = <T>(
  tx: TrustLevelDb | undefined,
  run: (db: TrustLevelDb) => Promise<T>
) => (tx ? run(tx) : prisma.$transaction((db) => run(db)));

const changeTrustLevel = async (
  db: TrustLevelDb,
  userId: number,
  toLevel: TrustLevel,
  reason: TrustLevelChangeReason,
  { changedByUserId, contentFlagId }: TrustLevelChangeOptions
) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { trustLevel: true },
  });
  if (!user || user.trustLevel === toLevel) {
    return null;
  }
  const fromLevel = user.trustLevel;
  const updated = await db.user.updateMany({
    where: { id: userId, trustLevel: fromLevel },
    data: { trustLevel: toLevel },
  });
  if (updated.count === 0) {
    return null;
  }
  return db.userTrustLevelChange.create({
    data: {
      userId,
      fromLevel,
      toLevel,
      reason,
      changedByUserId,
      contentFlagId,
    },
  });
};

export const setUserTrustLevel = (
  userId: number,
  toLevel: TrustLevel,
  reason: TrustLevelChangeReason,
  options: TrustLevelChangeOptions = {}
) =>
  inTrustLevelTransaction(options.tx, (db) =>
    changeTrustLevel(db, userId, toLevel, reason, options)
  );

export const applyTrustSignal = (
  userId: number,
  signal: TrustSignal,
  options: TrustLevelChangeOptions = {}
) =>
  inTrustLevelTransaction(options.tx, async (db) => {
    const targetLevel = DEFAULT_TRUST_LEVEL_RULES[signal];
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { trustLevel: true },
    });
    if (!user || user.trustLevel >= targetLevel) {
      return null;
    }
    return changeTrustLevel(db, userId, targetLevel, signal, options);
  });

export const applyTrustPenalty = (
  userId: number,
  penalty: TrustPenalty,
  options: TrustLevelChangeOptions = {}
) =>
  inTrustLevelTransaction(options.tx, async (db) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { trustLevel: true },
    });
    if (!user || user.trustLevel <= TRUST_LEVELS.NEW) {
      return null;
    }
    return changeTrustLevel(
      db,
      userId,
      (user.trustLevel - 1) as TrustLevel,
      penalty,
      options
    );
  });
