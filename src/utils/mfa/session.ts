export const ADMIN_MFA_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const isSecondFactorFresh = (mfaAt: unknown, now = Date.now()) =>
  typeof mfaAt === "number" &&
  mfaAt <= now &&
  now - mfaAt < ADMIN_MFA_MAX_AGE_MS;

export const secondFactorVerifiedUntil = (mfaAt: unknown) =>
  isSecondFactorFresh(mfaAt)
    ? new Date((mfaAt as number) + ADMIN_MFA_MAX_AGE_MS)
    : null;
