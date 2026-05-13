/**
 * Helpers for reading server-injected JSON blobs from the HTML.
 * The server embeds these as <script type="application/json"> tags so the
 * client can hydrate without an extra round-trip on first load.
 */

function readInjectedScript<T>(
  id: string,
  expectedObjectId?: string | number
): T | undefined {
  if (typeof document === "undefined") return undefined;
  const script = document.getElementById(id);
  if (!script?.textContent) return undefined;

  // If an expected ID is provided, validate it matches the data-object-id attribute
  if (expectedObjectId !== undefined) {
    const objectId = script.getAttribute("data-object-id");
    if (objectId === null || String(objectId) !== String(expectedObjectId)) {
      return undefined;
    }
  }

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
  // Try to match by ID first
  const parsed = readInjectedScript<{ post?: Post }>("__MIRLO_POST__", postId);
  let injected = parsed?.post;
  if (!injected) {
    // Fallback: check if slug matches (no data-object-id validation)
    const fallback = readInjectedScript<{ post?: Post }>("__MIRLO_POST__");
    const fallbackPost = fallback?.post;
    if (
      fallbackPost &&
      fallbackPost.urlSlug?.toLowerCase() === postId.toLowerCase()
    ) {
      injected = fallbackPost;
    }
  }

  if (!injected) return undefined;
  const matchesArtist =
    !artistSlug ||
    injected.artist?.urlSlug?.toLowerCase() === artistSlug.toLowerCase();
  return matchesArtist ? injected : undefined;
};

export const getInjectedTrack = (trackId: string): Track | undefined => {
  const parsed = readInjectedScript<{ track?: Track }>(
    "__MIRLO_TRACK__",
    trackId
  );
  return parsed?.track;
};

export const getInjectedTrackGroup = (
  trackGroupId: string
): TrackGroup | undefined => {
  const parsed = readInjectedScript<{ trackGroup?: TrackGroup }>(
    "__MIRLO_TRACKGROUP__",
    trackGroupId
  );
  console.log("getInjectedTrackGroup", { trackGroupId, parsed });
  return parsed?.trackGroup;
};

export const getInjectedArtist = (
  artistId: string | number
): Artist | undefined => {
  console.log("getting artist", artistId);
  const parsed = readInjectedScript<{ artist?: Artist }>(
    "__MIRLO_ARTIST__",
    artistId
  );
  console.log("parsed", parsed);
  return parsed?.artist;
};
