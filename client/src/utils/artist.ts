import { CLIENT_ROOT } from "../constants";

export const canUserEditArtist = (
  user:
    | Pick<LoggedInUser, "id" | "isAdmin" | "editableArtistIds">
    | null
    | undefined,
  artist: { id?: number; userId?: number } | null | undefined,
  { allowAdmin = true }: { allowAdmin?: boolean } = {}
): boolean => {
  if (!user || !artist) {
    return false;
  }
  if (allowAdmin && user.isAdmin) {
    return true;
  }
  return (
    artist.userId === user.id ||
    (artist.id !== undefined && !!user.editableArtistIds?.includes(artist.id))
  );
};

export const getPaidTierCount = (artist: {
  subscriptionTiers: { isDefaultTier: boolean }[];
}) => artist.subscriptionTiers.filter((tier) => !tier.isDefaultTier).length;

export const canSupportArtist = (
  artist: { subscriptionTiers: { isDefaultTier: boolean }[] },
  stripeAccountStatus?: { chargesEnabled?: boolean }
) => !!stripeAccountStatus?.chargesEnabled && getPaidTierCount(artist) > 0;

export const isReleaseArtist = (
  trackArtist: { artistId?: number; artistName?: string },
  artist?: { id: number; name: string }
) => {
  if (!artist) {
    return false;
  }
  if (trackArtist.artistId) {
    return trackArtist.artistId === artist.id;
  }
  return (
    trackArtist.artistName?.trim().toLowerCase() ===
    artist.name.trim().toLowerCase()
  );
};

export const isTipOnlyArtist = (artist: {
  subscriptionTiers: { isDefaultTier: boolean }[];
  properties?: { showTipOnSupportPage?: boolean };
}) =>
  getPaidTierCount(artist) === 0 && !!artist.properties?.showTipOnSupportPage;

export const getArtistUrlReference = (artist: {
  urlSlug?: string;
  id?: number;
}) => {
  if (artist.urlSlug) {
    return `${artist.urlSlug.toLowerCase()}`;
  }
  return `${artist.id}`;
};

export const getTrackGroupUrlReference = (trackGroup: {
  urlSlug?: string;
  id: number;
}) => {
  if (!!trackGroup.urlSlug) {
    return trackGroup.urlSlug.toLowerCase();
  }
  return `${trackGroup.id}`;
};

export const isTrackGroupPublished = (trackGroup: {
  publishedAt?: string | null;
}) => {
  return (
    !!trackGroup.publishedAt && new Date(trackGroup.publishedAt) <= new Date()
  );
};

export const getArtistUrl = (artist: { urlSlug?: string; id?: number }) => {
  return `/${getArtistUrlReference(artist)}`;
};

export const buildCheckoutCompletePath = (
  artist: { urlSlug?: string; id?: number },
  params: Record<string, string>
) => {
  return `${encodeURI(getArtistUrl(artist))}/checkout-complete?${new URLSearchParams(params).toString()}`;
};

export const getArtistManageUrl = (artistId: number) => {
  return `/manage/artists/${artistId}`;
};

export const getArtistTiersUrl = (artist: {
  urlSlug?: string;
  id?: number;
}) => {
  return `/${getArtistUrlReference(artist)}/support`;
};

export const getArtistReleasesUrl = (artist: {
  urlSlug?: string;
  id?: number;
}) => {
  return `/${getArtistUrlReference(artist)}/releases`;
};

export const TIERS_VIEW_ALL_SEARCH = "?view=all";

export const getArtistAllTiersUrl = (artist: {
  urlSlug?: string;
  id?: number;
}) => {
  return `${getArtistTiersUrl(artist)}${TIERS_VIEW_ALL_SEARCH}`;
};

export const getArtistTierUrl = (
  artist: { urlSlug?: string; id?: number },
  tier: { id: number; urlSlug?: string | null }
) => {
  return `${getArtistTiersUrl(artist)}/${tier.urlSlug ?? tier.id}`;
};

export const getArtistManageTiersUrl = (artistId: number) => {
  return getArtistManageUrl(artistId) + "/tiers";
};

export const getArtistManageMerchUrl = (artistId: number, merchId: string) => {
  return `/manage/artists/${artistId}/merch/${merchId}`;
};

export const getTrackGroupWidget = (trackGroupId: number) => {
  return `${CLIENT_ROOT}/widget/trackGroup/${trackGroupId}`;
};

export const getTrackWidget = (trackId: number) => {
  return `${CLIENT_ROOT}/widget/track/${trackId}`;
};

export const getLabelWidget = (labelId: number) => {
  return `${CLIENT_ROOT}/widget/label/${labelId}`;
};

export const getReleaseUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number }
) => {
  return `/${getArtistUrlReference(artist)}/release/${getTrackGroupUrlReference(
    trackGroup
  )}`;
};

export const getManageReleaseUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number }
) => {
  return `${getArtistManageUrl(artist.id)}/release/${trackGroup.id}`;
};

export const getTrackUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number },
  track: { id: number }
) => {
  return `/${getArtistUrlReference(artist)}/release/${getTrackGroupUrlReference(
    trackGroup
  )}/tracks/${track.id}`;
};

export const getFundraiserUrl = (
  artist: { urlSlug?: string; id: number },
  fundraiser: { id: number; urlSlug?: string | null }
) =>
  `/${getArtistUrlReference(artist)}/fundraiser/${fundraiser.urlSlug ?? fundraiser.id}`;

export const getMerchUrl = (
  artist: { urlSlug?: string; id: number },
  merch: { id: string; urlSlug?: string | null }
) => {
  return `/${getArtistUrlReference(artist)}/merch/${merch.urlSlug ?? merch.id}`;
};

export const getPostURLReference = (post: Post) => {
  return post.artist
    ? `/${getArtistUrlReference(post.artist)}/posts/${post.urlSlug ?? post.id}/`
    : `/post/${post.id}`;
};

export const getManagePostURLReference = (post: Post) => {
  if (post.artistId) {
    return `${getArtistManageUrl(post.artistId)}/post/${post.id}/`;
  }
  return "";
};

const listFormatters = new Map<string, Intl.ListFormat>();

const getListFormatter = (locale?: string) => {
  const key = locale ?? "";
  let formatter = listFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.ListFormat(locale, { type: "conjunction" });
    listFormatters.set(key, formatter);
  }
  return formatter;
};

export const listSeparators = (count: number, locale?: string) =>
  count < 2
    ? []
    : getListFormatter(locale)
        .formatToParts(Array.from({ length: count }, (_, index) => `${index}`))
        .filter((part) => part.type === "literal")
        .map((part) => part.value);

const formatNameList = (names: string[], locale?: string) =>
  names.length < 2 ? (names[0] ?? "") : getListFormatter(locale).format(names);

export const getArtistLinkUrl = (link: ArtistLink) => {
  if (link.urlSlug) {
    return getArtistUrl({ urlSlug: link.urlSlug });
  }
  if (link.artistId) {
    return `/${link.artistId}`;
  }
  return undefined;
};

export const getReleaseArtistLinks = (
  trackGroup: Pick<TrackGroup, "releaseArtists">
): ArtistLink[] => trackGroup.releaseArtists ?? [];

export const getReleaseArtistName = (
  trackGroup: Parameters<typeof getReleaseArtistLinks>[0],
  locale?: string
) =>
  formatNameList(
    getReleaseArtistLinks(trackGroup).map((link) => link.name),
    locale
  );

export const hasCreditedReleaseArtists = (
  trackGroup: Pick<TrackGroup, "releaseArtistsSource">
) => trackGroup.releaseArtistsSource === "credited";

export const getTrackArtistsByAppearance = (
  track: Pick<Track, "mainArtists" | "featuredArtists" | "mainArtistsSource">
) => ({
  main: track.mainArtistsSource === "track" ? (track.mainArtists ?? []) : [],
  featured: track.featuredArtists ?? [],
});

export const formatTrackArtistLine = (
  track: Pick<Track, "mainArtists" | "featuredArtists">,
  joinGuests: (main: string, featured: string) => string,
  locale?: string
) => {
  const names = (links: ArtistLink[]) =>
    formatNameList(
      links.map((link) => link.name),
      locale
    );
  const artistName = names(track.mainArtists ?? []);
  const featured = track.featuredArtists ?? [];
  return featured.length ? joinGuests(artistName, names(featured)) : artistName;
};

export const normalizeArtistName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
