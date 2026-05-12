/**
 * Helpers for reading server-injected JSON blobs from the HTML.
 * The server embeds these as <script type="application/json"> tags so the
 * client can hydrate without an extra round-trip on first load.
 */

function readInjectedScript<T>(id: string): T | undefined {
  if (typeof document === "undefined") return undefined;
  const script = document.getElementById(id);
  if (!script?.textContent) return undefined;
  try {
    return JSON.parse(script.textContent) as T;
  } catch {
    return undefined;
  }
}

export const getInjectedAuthUser = (): LoggedInUser | null | undefined => {
  const parsed = readInjectedScript<{ user?: LoggedInUser | null }>(
    "__MIRLO_AUTH__"
  );
  if (!parsed) return undefined;
  return parsed.user ?? null;
};

export const getInjectedPost = (
  postId: string,
  artistSlug: string
): Post | undefined => {
  const parsed = readInjectedScript<{ post?: Post }>("__MIRLO_POST__");
  const injected = parsed?.post;
  if (!injected) return undefined;
  // Only use the injected payload if it actually matches the route the
  // component is asking about — otherwise fall through to the network fetch.
  const matchesId = String(injected.id) === postId;
  const matchesSlug = injected.urlSlug?.toLowerCase() === postId.toLowerCase();
  const matchesArtist =
    !artistSlug ||
    injected.artist?.urlSlug?.toLowerCase() === artistSlug.toLowerCase();
  if ((matchesId || matchesSlug) && matchesArtist) return injected;
  return undefined;
};

export const getInjectedTrack = (trackId: string): Track | undefined => {
  const parsed = readInjectedScript<{ track?: Track }>("__MIRLO_TRACK__");
  const injected = parsed?.track;
  if (injected && String(injected.id) === trackId) return injected;
  return undefined;
};

export const getInjectedTrackGroup = (
  trackGroupId: string
): TrackGroup | undefined => {
  const parsed = readInjectedScript<{ trackGroup?: TrackGroup }>(
    "__MIRLO_TRACKGROUP__"
  );
  const injected = parsed?.trackGroup;
  if (injected && String(injected.id) === trackGroupId) return injected;
  return undefined;
};

export const getInjectedArtist = (artistId: number): Artist | undefined => {
  const parsed = readInjectedScript<{ artist?: Artist }>("__MIRLO_ARTIST__");
  const injected = parsed?.artist;
  if (injected && injected.id === artistId) return injected;
  return undefined;
};
