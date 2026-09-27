import prisma from "@mirlo/prisma";

import {
  applyTrustPenalty,
  setUserTrustLevel,
  TRUST_LEVELS,
} from "./trustLevel";

export const SPAM_CONTACT_MESSAGE_REASON = "spamContactMessage";
export const SPAM_STRIKES_PER_TRUST_LEVEL_DROP = 2;
export const SPAM_STRIKES_TO_DISABLE = 5;

type SpamStrikesDb = Pick<
  typeof prisma,
  "user" | "contentFlag" | "userTrustLevelChange"
>;

export const applySpamStrike = async (
  userId: number,
  contentFlagId: number,
  db: SpamStrikesDb
) => {
  const { spamStrikes } = await db.user.update({
    where: { id: userId },
    data: { spamStrikes: { increment: 1 } },
    select: { spamStrikes: true },
  });
  await db.contentFlag.update({
    where: { id: contentFlagId },
    data: { spamStrikeNumber: spamStrikes },
  });
  if (spamStrikes >= SPAM_STRIKES_TO_DISABLE) {
    await db.user.updateMany({
      where: { id: userId, disabledAt: null },
      data: { disabledAt: new Date() },
    });
    await setUserTrustLevel(userId, TRUST_LEVELS.NEW, "SPAM_REPORTED", {
      contentFlagId,
      tx: db,
    });
  } else if (spamStrikes % SPAM_STRIKES_PER_TRUST_LEVEL_DROP === 0) {
    await applyTrustPenalty(userId, "SPAM_REPORTED", { contentFlagId, tx: db });
  }
  return spamStrikes;
};
