import type {
  AdminStats,
  AdminTopAccounts,
  StatsGranularity,
  TopAccountsPeriod,
} from "queries/admin";

const ARTIST_NAMES = [
  "Ana Frango Elétrico",
  "The Blue Herons",
  "Kestrel Choir",
  "DJ Moth",
  "Sleepy Orchard",
];

export const TOP_SELLER_NAME = ARTIST_NAMES[0];

/**
 * Descending totals so the tables read like a real ranking. A year scales the
 * month's numbers by 12 so switching the period visibly changes them.
 */
export const makeTopAccounts = (
  period: TopAccountsPeriod,
  count = 12
): AdminTopAccounts => {
  const scale = period === "year" ? 12 : 1;
  return {
    period,
    sellers: Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      name: ARTIST_NAMES[index] ?? `Artist ${index + 1}`,
      urlSlug: `artist-${index + 1}`,
      usdCents: (count - index) * 4250 * scale,
      transactionCount: (count - index) * 3 * scale,
    })),
    purchasers: Array.from({ length: count }, (_, index) => ({
      id: 100 + index,
      // Every third purchaser has no name, so the email fallback shows.
      name: index % 3 === 2 ? null : `Listener ${index + 1}`,
      email: `listener${index + 1}@example.com`,
      usdCents: (count - index) * 1800 * scale,
      transactionCount: (count - index) * scale,
    })),
  };
};

/**
 * A year of dashboard stats with a gentle upward trend and some wobble, so
 * the charts have a recognisable shape. Dates are fixed rather than relative
 * to today so stories render identically every time.
 */
export const makeAdminStats = (granularity: StatsGranularity): AdminStats => {
  const buckets = granularity === "month" ? 13 : 53;
  const perBucket = granularity === "month" ? 4.3 : 1;
  const end = new Date(Date.UTC(2026, 8, 21));

  const dates = Array.from({ length: buckets }, (_, index) => {
    const date = new Date(end);
    if (granularity === "month") {
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - (buckets - 1 - index));
    } else {
      date.setUTCDate(date.getUTCDate() - 7 * (buckets - 1 - index));
    }
    return date.toISOString().slice(0, 10);
  });

  const wave = (index: number, base: number, growth: number) =>
    Math.round(
      (base + growth * index + base * 0.3 * Math.sin(index / 2)) * perBucket
    );

  return {
    granularity,
    userSignups: dates.map((date, index) => ({
      date,
      count: wave(index, 40, 0.8),
    })),
    artistSignups: dates.map((date, index) => ({
      date,
      count: wave(index, 6, 0.1),
    })),
    revenue: dates.map((date, index) => ({
      date,
      purchasesUsdCents: wave(index, 180000, 2500),
      subscriptionsUsdCents: wave(index, 90000, 1500),
      purchasesConvertedUsdCents: wave(index, 40000, 600),
      subscriptionsConvertedUsdCents: wave(index, 15000, 300),
      platformCutUsdCents: wave(index, 19000, 280),
      platformCutConvertedUsdCents: wave(index, 3900, 60),
    })),
    transactionCounts: ["usd", "eur", "gbp"].flatMap((currency, rank) =>
      dates.map((date, index) => ({
        date,
        currency,
        count: wave(index, 120 / (rank + 1) ** 2, 1.5 / (rank + 1)),
      }))
    ),
    avgMonthlyPlays: 184230,
    avgMonthlyActiveUsers: 5120,
    avgMonthlyAlbumDownloads: 2310,
  };
};
