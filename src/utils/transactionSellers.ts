import { Prisma } from "@mirlo/prisma/client";

/**
 * One `(tx_id, "profileId")` row per thing a transaction paid for, naming the
 * profile that sold it. A transaction can pay for several items, so callers
 * that want one seller per transaction should `DISTINCT ON (tx_id)`.
 */
export const transactionSellerLinks = Prisma.sql`
  SELECT x."userTransactionId" AS tx_id, tg."profileId"
  FROM "UserTrackGroupPurchase" x
  JOIN "TrackGroup" tg ON tg.id = x."trackGroupId"
  UNION ALL
  SELECT x."transactionId", tg."profileId"
  FROM "UserTrackPurchase" x
  JOIN "Track" tr ON tr.id = x."trackId"
  JOIN "TrackGroup" tg ON tg.id = tr."trackGroupId"
  UNION ALL
  SELECT x."transactionId", m."profileId"
  FROM "MerchPurchase" x
  JOIN "Merch" m ON m.id = x."merchId"
  UNION ALL
  SELECT x."transactionId", x."profileId"
  FROM "UserProfileTip" x
  UNION ALL
  SELECT x."transactionId", st."profileId"
  FROM "ProfileUserSubscriptionCharge" x
  JOIN "ProfileUserSubscription" s ON s.id = x."profileUserSubscriptionId"
  JOIN "ProfileSubscriptionTier" st ON st.id = s."profileSubscriptionTierId"
  UNION ALL
  SELECT x."associatedTransactionId", tg."profileId"
  FROM "FundraiserPledge" x
  JOIN "TrackGroup" tg ON tg.id = x."trackGroupId"
`;
