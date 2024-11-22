import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React from "react";
import { MirloFetchError } from "./fetch/MirloFetchError";
import { authRefresh } from "./auth";
import { QUERY_KEY_AUTH } from "./queryKeys";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: (failureCount, error) => {
        // Don't retry for auth-related errors
        if (
          error instanceof MirloFetchError &&
          (error.status === 400 || error.status === 401)
        ) {
          return false;
        }

        // Retry others just once
        return failureCount <= 1;
      },
    },
  },
  queryCache: new QueryCache({
    onError: async (error) => {
      if (
        error instanceof MirloFetchError &&
        (error.status === 400 || error.status === 401)
      ) {
        console.error(
          `Received a ${error.status} response - refreshing auth...`
        );
        await authRefresh();
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.includes(QUERY_KEY_AUTH),
        });
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
