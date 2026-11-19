import type {
  AdminStats,
  AdminTopArtist,
  AdminTopRanking,
  AdminTopRankingRows,
  StatsGranularity,
  TopRanking,
  TopRankingPeriod,
} from "queries/admin";

const ARTIST_NAMES = [
  "Ana Frango Elétrico",
  "The Blue Herons",
  "Kestrel Choir",
  "DJ Moth",
  "Sleepy Orchard",
];

export const TOP_SELLER_NAME = ARTIST_NAMES[0];

export type TopRankings = {
  [R in TopRanking]: AdminTopRanking<AdminTopRankingRows[R]>;
};

const makeArtist = (
  id: number,
  name: string,
  overrides: Partial<AdminTopArtist>
): AdminTopArtist => ({
  id,
  name,
  urlSlug: `artist-${id}`,
  email: `artist${id}@example.com`,
  createdAt: "2025-03-14T00:00:00.000Z",
  location: null,
  label: null,
  albumCount: 3,
  trackCount: 24,
  merchCount: 2,
  tierCount: 1,
  albumDownloads: 0,
  freeDownloads: 0,
  revenueCents: 0,
  salesCount: 0,
  albumsUploaded: 0,
  tracksUploaded: 0,
  ...overrides,
});

/**
 * Descending totals so the tables read like a real ranking. A year scales the
 * month's numbers by 12 so switching the period visibly changes them.
 */
export const makeTopRankings = (
  period: TopRankingPeriod,
  count = 12
): TopRankings => {
  const scale = period === "year" ? 12 : 1;
  const ranked = <Row>(row: (index: number, weight: number) => Row) => ({
    period,
    currency: "usd",
    rows: Array.from({ length: count }, (_, index) =>
      row(index, (count - index) * scale)
    ),
  });

  return {
    topSellers: ranked((index, weight) =>
      makeArtist(index + 1, ARTIST_NAMES[index] ?? `Artist ${index + 1}`, {
        revenueCents: weight * 4250,
        salesCount: weight * 3,
      })
    ),
    topPurchasers: ranked((index, weight) => ({
      id: 100 + index,
      // Every third purchaser has no name, so the email fallback shows.
      name: index % 3 === 2 ? null : `Listener ${index + 1}`,
      email: `listener${index + 1}@example.com`,
      createdAt: "2025-06-01T00:00:00.000Z",
      cents: weight * 1800,
      transactionCount: weight,
      artistCount: Math.ceil(weight / 2),
    })),
    topListeners: ranked((index, weight) => ({
      id: 600 + index,
      name: `Fan ${index + 1}`,
      email: `fan${index + 1}@example.com`,
      createdAt: "2025-06-01T00:00:00.000Z",
      playCount: weight * 37,
      trackCount: weight * 9,
      artistCount: weight * 2,
    })),
    topFreeDownloads: ranked((index, weight) =>
      makeArtist(200 + index, `Free Artist ${index + 1}`, {
        freeDownloads: weight * 7,
      })
    ),
    topUploaders: ranked((index, weight) =>
      makeArtist(300 + index, `Uploader ${index + 1}`, {
        tracksUploaded: weight * 2,
        albumsUploaded: Math.ceil(weight / 5),
      })
    ),
    topAlbums: ranked((index, weight) => ({
      id: 400 + index,
      title: `Album ${index + 1}`,
      releaseDate: "2025-09-01T00:00:00.000Z",
      artistId: 500 + index,
      artistName: `Album Artist ${index + 1}`,
      artistEmail: `album-artist${index + 1}@example.com`,
      downloadCount: weight * 11,
      revenueCents: weight * 900,
      salesCount: weight,
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
    currency: "usd",
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
      purchasesCents: wave(index, 180000, 2500),
      subscriptionsCents: wave(index, 90000, 1500),
      purchasesConvertedCents: wave(index, 40000, 600),
      subscriptionsConvertedCents: wave(index, 15000, 300),
      platformCutCents: wave(index, 19000, 280),
      platformCutConvertedCents: wave(index, 3900, 60),
      instanceProfileCents: wave(index, 6000, 90),
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
