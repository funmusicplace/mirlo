export type SupportTier = {
  id: number;
  user: User;
  createdAt: string;
  amount: number;
  deleteReason?: string | null;
  nextBillingDate?: string;
  shippingAddress: {
    name: string;
    address: Object;
  };
  artistSubscriptionTier: ArtistSubscriptionTier;
  artistUserSubscriptionCharges?: {
    id: string;
    transactionId?: string;
    transaction?: {
      platformCut: number | null;
      stripeCut: number | null;
      paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
    } | null;
  }[];
};

// A subscription with no associated transaction was added by the artist
// without payment (e.g. a comp), so we surface it as "Free".
export const isFreeSubscription = (r: SupportTier) =>
  !r.artistUserSubscriptionCharges?.some((charge) => charge.transactionId);

export const joinedInPastMonth = (r: SupportTier, now = new Date()) => {
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return new Date(r.createdAt) >= monthAgo;
};

export const supporterSortOptions = [
  "createdAt",
  "name",
  "email",
  "tier",
  "interval",
  "amount",
] as const;

export type SupporterSort = (typeof supporterSortOptions)[number];

const compareText = (a = "", b = "") =>
  a.localeCompare(b, undefined, { sensitivity: "base" });

const comparators: Record<
  SupporterSort,
  (a: SupportTier, b: SupportTier) => number
> = {
  createdAt: (a, b) => (a.createdAt > b.createdAt ? -1 : 1),
  name: (a, b) => compareText(a.shippingAddress?.name, b.shippingAddress?.name),
  email: (a, b) => compareText(a.user.email, b.user.email),
  tier: (a, b) =>
    compareText(a.artistSubscriptionTier.name, b.artistSubscriptionTier.name),
  interval: (a, b) =>
    compareText(
      a.artistSubscriptionTier.interval,
      b.artistSubscriptionTier.interval
    ),
  amount: (a, b) => b.amount - a.amount,
};

export const sortSupporters = (
  supporters: SupportTier[],
  sort: SupporterSort
) => [...supporters].sort(comparators[sort]);
