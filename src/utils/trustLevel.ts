export const TRUST_LEVELS = {
  NEW: 0,
  VERIFIED: 1,
  REGULAR: 2,
  TRUSTED: 3,
} as const;

export type TrustLevel = (typeof TRUST_LEVELS)[keyof typeof TRUST_LEVELS];

export const isTrustLevel = (value: unknown): value is TrustLevel =>
  Object.values(TRUST_LEVELS).includes(value as TrustLevel);
