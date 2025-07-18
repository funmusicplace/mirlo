import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_NOTIFICATIONS, QUERY_KEY_TAGS } from "./queryKeys";

const fetchNotifications: QueryFunction<
  { results: Notification[]; total?: number },
  [
    "fetchNotifications",
    {
      userId?: number;
      skip?: number;
      take?: number;
      orderBy?: "asc" | "count";
    },
    ...any,
  ]
> = ({ queryKey: [_, { userId, skip, take, orderBy }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (orderBy) params.append("orderBy", orderBy);

  return api.get(`v1/users/${userId}/notifications?${params}`, { signal });
};

export function queryNotifications(
  userId?: number,
  opts?: {
    skip?: number;
    take?: number;
    orderBy?: "asc" | "count";
  }
) {
  return queryOptions({
    queryKey: [
      "fetchNotifications",
      { userId, ...opts },
      QUERY_KEY_NOTIFICATIONS,
    ],
    queryFn: fetchNotifications,
    enabled: !!userId && isFinite(userId),
  });
}
