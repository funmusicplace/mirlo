export type MatchedRoute =
  | { type: "releases" }
  | { type: "auth"; pageType: "login" | "signup" }
  | {
      type: "track";
      profileSlug: string;
      albumSlug: string;
      trackId: number;
    }
  | { type: "album"; profileSlug: string; albumSlug: string }
  | {
      type: "post";
      profileSlug: string;
      postId: number;
      postSlug?: undefined;
    }
  | {
      type: "post";
      profileSlug: string;
      postSlug: string;
      postId?: undefined;
    }
  | { type: "posts-index"; profileSlug: string }
  | { type: "merch"; profileSlug: string; merchId: string }
  | { type: "merch-index"; profileSlug: string }
  | { type: "support"; profileSlug: string; tierId?: string }
  | { type: "profile-releases"; profileSlug: string }
  | { type: "profile"; profileSlug: string }
  | { type: "widget-track"; trackId: number }
  | { type: "widget-trackgroup"; trackGroupId: number };

/**
 * Route pattern and parser
 */
export type RoutePattern<T extends MatchedRoute = MatchedRoute> = {
  pattern: (segments: string[]) => T | null;
};

/**
 * Route patterns with type-safe parameter extraction.
 * Patterns are tried in order until one matches.
 */
const routePatterns: Array<RoutePattern> = [
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
            profileSlug: segments[0],
            albumSlug: segments[2],
            trackId: Number(segments[4]),
          }
        : null,
  },
  // /artistSlug/release/albumSlug - album detail
  {
    pattern: (segments) =>
      segments.length === 3 && segments[1] === "release"
        ? { type: "album", profileSlug: segments[0], albumSlug: segments[2] }
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
            profileSlug: segments[0],
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
            profileSlug: segments[0],
            postSlug: segments[2],
          }
        : null,
  },
  // /artistSlug/posts - posts index
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "posts"
        ? { type: "posts-index", profileSlug: segments[0] }
        : null,
  },
  // /artistSlug/merch/merchId (by UUID or slug)
  {
    pattern: (segments) =>
      segments.length === 3 && segments[1] === "merch"
        ? {
            type: "merch",
            profileSlug: segments[0],
            merchId: segments[2],
          }
        : null,
  },
  // /artistSlug/merch - merch index
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "merch"
        ? { type: "merch-index", profileSlug: segments[0] }
        : null,
  },
  // /artistSlug/support/tierId (by id or slug)
  {
    pattern: (segments) =>
      segments.length === 3 && segments[1] === "support"
        ? { type: "support", profileSlug: segments[0], tierId: segments[2] }
        : null,
  },
  // /artistSlug/support
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "support"
        ? { type: "support", profileSlug: segments[0] }
        : null,
  },
  // /artistSlug/releases
  {
    pattern: (segments) =>
      segments.length === 2 && segments[1] === "releases"
        ? { type: "profile-releases", profileSlug: segments[0] }
        : null,
  },
  // /artistSlug - artist profile
  {
    pattern: (segments) =>
      segments.length === 1
        ? { type: "profile", profileSlug: segments[0] }
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
export const matchRoute = (segments: string[]): MatchedRoute | null => {
  for (const routePattern of routePatterns) {
    const params = routePattern.pattern(segments);
    if (params !== null) {
      return params;
    }
  }
  return null;
};
