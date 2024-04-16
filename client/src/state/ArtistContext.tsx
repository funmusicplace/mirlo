import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryArtist, queryUserStripeStatus } from "queries";
import {
  QUERY_KEY_ARTISTS,
  queryKeyIncludes,
  queryKeyMatches,
} from "queries/queryKeys";
import React from "react";
import { useParams } from "react-router-dom";

/**
 * @deprecated This is only here to support previous usage - new implementations should rely on useQuery or pass props.
 */
export const useArtistContext = () => {
  const { artistId } = useParams();
  const { data: artist, isLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "", includeDefaultTier: false })
  );
  const { data: userStripeStatus } = useQuery(
    queryUserStripeStatus(Number(artist?.userId))
  );

  // TODO: eventually remove the manual refresh() once everything is a mutation
  const queryClient = useQueryClient();
  const refresh = React.useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        queryKeyMatches(query, { artistId: Number(artistId) }) ||
        queryKeyMatches(query, { artistSlug: artist?.urlSlug ?? "" }) ||
        queryKeyIncludes(query, QUERY_KEY_ARTISTS),
    });
  }, [queryClient, artistId, artist]);

  return {
    state: {
      artist,
      isLoading,
      userStripeStatus,
    },
    refresh,
  };
};
