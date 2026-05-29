import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React from "react";

import { authRefresh } from "./auth";
import { MirloFetchError } from "./fetch/MirloFetchError";
import { QUERY_KEY_AUTH } from "./queryKeys";

// Deduplicates concurrent 401s so only one refresh call is in flight at a time.
let pendingRefresh: Promise<void> | null = null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: (failureCount, error) => {
        // Don't retry for auth-related errors or rate-limit responses
        if (
          error instanceof MirloFetchError &&
          (error.status === 400 || error.status === 401 || error.status === 429)
        ) {
          return false;
        }

        // Retry others just once
        return failureCount <= 1;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // Only 401 indicates an expired session — 400 is a client/validation error,
      // not an auth failure, and should not trigger a token refresh.
      if (error instanceof MirloFetchError && error.status === 401) {
        console.error("Received a 401 response - refreshing auth...");
        if (!pendingRefresh) {
          // Invalidation is inside the chain so it fires exactly once even when
          // many concurrent queries return 401 simultaneously. Scope the
          // invalidation to the profile query only to avoid cascading refetches of unrelated queries
          // like fetchUserCollection / fetchUserWishlistTrackGroups.
          pendingRefresh = authRefresh()
            .catch(() => {})
            .then(() =>
              queryClient.invalidateQueries({
                queryKey: ["fetchProfile", QUERY_KEY_AUTH],
              })
            )
            .finally(() => {
              pendingRefresh = null;
            });
        }
      }
    },
  }),
});

const ReactQueryDevtools = React.lazy(() =>
  process.env.NODE_ENV === "development"
    ? import("@tanstack/react-query-devtools").then(
        ({ ReactQueryDevtools }) => ({ default: ReactQueryDevtools })
      )
    : Promise.resolve({ default: () => undefined as never })
);

export function QueryClientWrapper(
  props: React.PropsWithChildren<{ devTools?: boolean }>
) {
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      {props.devTools !== false && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
