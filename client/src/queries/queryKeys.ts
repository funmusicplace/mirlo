import { identity, isMatch, pickBy } from "lodash";

/**
 * Categorizes any query that should be invalidated when the user auth
 * state is changed.
 *
 * For example, if a query returns different data based on the user that is logged in -
 * this ensures that the cache will not leak between sessions on the same browser.
 */
export const QUERY_KEY_AUTH = "auth";

/**
 * Categorizes any query that should be invalidated when any artist is changed,
 * regardless of the artistId/artistSlug.
 */
export const QUERY_KEY_ARTISTS = "artists";

/**
 * Categorizes any query that should be invalidated when any trackgroup is changed,
 * regardless of the trackGroupId.
 */
export const QUERY_KEY_TRACK_GROUPS = "trackGroups";

/**
 * Categorizes any query that should be invalidated when any trackgroup is changed,
 * regardless of the trackGroupId.
 */
export const QUERY_KEY_TAGS = "tags";

/**
 * Categorizes any query that should be invalidated when any trackgroup is changed,
 * regardless of the trackGroupId.
 */
export const QUERY_KEY_POSTS = "trackGroups";

export type QueryTag =
  | typeof QUERY_KEY_AUTH
  | typeof QUERY_KEY_ARTISTS
  | typeof QUERY_KEY_TRACK_GROUPS;

export type QueryArgs = {
  artistId: number;
  artistSlug: string;
};

/**
 * Checks whether the arguments in a given query key contains
 * ALL of the provided args.
 */
export function queryKeyMatches(
  query: { queryKey: unknown },
  args: Partial<QueryArgs>
): boolean {
  if (query.queryKey instanceof Array) {
    const queryArgs = query.queryKey[1];
    if (queryArgs && typeof queryArgs === "object") {
      return isMatch(pickBy(queryArgs, identity), pickBy(args, identity));
    }
  }

  return false;
}

/**
 * Checks whether a given query key includes ALL of the provided tags
 */
export function queryKeyIncludes(
  query: { queryKey: unknown },
  ...tags: QueryTag[]
): boolean {
  if (query.queryKey instanceof Array) {
    const key = query.queryKey;
    return tags.every((tag) => key.includes(tag));
  }

  return false;
}
