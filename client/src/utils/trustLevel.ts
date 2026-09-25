export const DEFAULT_TRUST_LEVEL_NAMES = [
  "New",
  "Verified",
  "Regular",
  "Trusted",
];

export const TRUST_LEVEL_CHANGE_REASON_LABELS: Record<
  UserTrustLevelChange["reason"],
  string
> = {
  ADMIN: "Changed by an admin",
  PAYMENT_ACCOUNT_VERIFIED: "Payment account verified",
  SPAM_REPORTED: "Reported for spam",
};
