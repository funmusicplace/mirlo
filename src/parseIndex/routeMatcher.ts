export type RouteParams = Record<string, string | number | undefined>;

/**
 * Route pattern and parser
 */
export type RoutePattern<T extends RouteParams = RouteParams> = {
  pattern: (segments: string[]) => T | null;
};

/**
 * Route patterns with type-safe parameter extraction.
 * Patterns are tried in order until one matches.
 */
const routePatterns: Array<RoutePattern<any>> = [
  // /releases - latest releases page
  {
    pattern: (segments) =>
      segments[0] === "releases" && segments.length === 1
        ? { type: "releases" }
        : null,
  },
  // /login, /signup - auth pages
  {
    pattern: (segments) =>
      ["login", "signup"].includes(segments[0]) && segments.length === 1
        ? { type: "auth", pageType: segments[0] as "login" | "signup" }
        : null,
  },
  // /artistSlug/release/albumSlug/tracks/trackId - specific track
  {
    pattern: (segments) =>
      segments.length === 5 &&
      segments[1] === "release" &&
      segments[3] === "tracks" &&
      isFinite(Number(segments[4]))
        ? {
            type: "track",
            artistSlug: segments[0],
            albumSlug: segments[2],
            trackId: Number(segments[4]),
          }
        : null,
  },
  // /artistSlug/release/albumSlug - album detail
  {
    pattern: (segments) =>
      segments.length === 3 && segments[1] === "release"
        ? { type: "album", artistSlug: segments[0], albumSlug: segments[2] }
        : null,
  },
  // /artistSlug/posts/postId (by ID)
  {
    pattern: (segments) =>
      segments.length === 3 &&
      segments[1] === "posts" &&
      isFinite(Number(segments[2]))
        ? {
            type: "post",
            artistSlug: segments[0],
            postId: Number(segments[2]),
          }
        : null,
  },
  // /artistSlug/posts/postSlug (by slug)
  {
    pattern: (segments) =>
      segments.length === 3 && segments[1] === "posts"
        ? {
            type: "post",
            artistSlug: segments[0],
            postSlug: segments[2],
          }
        : null,
  },
  // /artistSlug/posts - posts index
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "posts"
        ? { type: "posts-index", artistSlug: segments[0] }
        : null,
  },
  // /artistSlug/merch/merchId (by UUID or slug)
  {
    pattern: (segments) =>
      segments.length === 3 && segments[1] === "merch"
        ? {
            type: "merch",
            artistSlug: segments[0],
            merchId: segments[2],
          }
        : null,
  },
  // /artistSlug/merch - merch index
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "merch"
        ? { type: "merch-index", artistSlug: segments[0] }
        : null,
  },
  // /artistSlug/support
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "support"
        ? { type: "support", artistSlug: segments[0] }
        : null,
  },
  // /artistSlug/releases
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "releases"
        ? { type: "artist-releases", artistSlug: segments[0] }
        : null,
  },
  // /artistSlug - artist profile
  {
    pattern: (segments) =>
      segments.length === 1
        ? { type: "artist", artistSlug: segments[0] }
        : null,
  },
  // /widget/track/:id
  {
    pattern: (segments) =>
      segments.length === 3 &&
      segments[0] === "widget" &&
      segments[1] === "track" &&
      isFinite(Number(segments[2]))
        ? { type: "widget-track", trackId: Number(segments[2]) }
        : null,
  },
  // /widget/trackgroup/:id
  {
    pattern: (segments) =>
      segments.length === 3 &&
      segments[0] === "widget" &&
      segments[1] === "trackGroup" &&
      isFinite(Number(segments[2]))
        ? { type: "widget-trackgroup", trackGroupId: Number(segments[2]) }
        : null,
  },
];

/**
 * Split a pathname into percent-decoded segments. Express's `req.path` (and
 * `new URL().pathname`) keep percent-encoding, so non-ASCII slugs like
 * `rau%C3%B0vik` would never match `urlSlug` values stored decoded in the
 * database. Decoding happens per segment, after splitting, so an encoded
 * `%2F` can't spawn a phantom segment.
 */
export const splitPathIntoSegments = (pathname: string): string[] =>
  pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        // Malformed percent-encoding (e.g. `%zz`) — keep the raw segment
        return segment;
      }
    });

/**
 * Match a pathname against route patterns and extract typed parameters
 */
export const matchRoute = (segments: string[]): RouteParams | null => {
  for (const routePattern of routePatterns) {
    const params = routePattern.pattern(segments);
    if (params !== null) {
      return params;
    }
  }
  return null;
};
