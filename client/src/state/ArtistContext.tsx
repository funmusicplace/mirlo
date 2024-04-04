import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isMatch } from "lodash";
import { queryArtist, queryUserStripeStatus } from "queries";
import { QUERY_KEY_ARTISTS } from "queries/keys";
import React from "react";
import { useParams } from "react-router-dom";

/**
 * @deprecated This is only here to support previous usage - new implementations should rely on useQuery or pass props.
 */
export const useArtistContext = () => {
  const { artistId } = useParams();
  const { data: artist, isLoading } = useQuery(queryArtist(artistId ?? ""));
  const { data: userStripeStatus } = useQuery(queryUserStripeStatus(Number(artist?.userId)));

  // TODO: eventually remove the manual refresh() once everything is a mutation
  const queryClient = useQueryClient();
  const refresh = React.useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => isMatch(Object(query.queryKey[0]), { artistId: Number(artistId) }) || query.queryKey.includes(QUERY_KEY_ARTISTS),
    });
  }, [queryClient, artistId]);

  return {
    state: {
      artist,
      isLoading,
      userStripeStatus,
    },
    refresh,
  };
};
