import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_NOTIFICATIONS } from "./queryKeys";

export const markAllNotificationsRead = (userId: number) =>
  api.put(`v1/users/${userId}/notifications/markAllRead`, {});

const fetchNotifications: QueryFunction<
  { results: Notification[]; total?: number },
  [
    "fetchNotifications",
    {
      userId?: number;
      skip?: number;
      take?: number;
      notificationType?: string[];
    },
    ...any,
  ]
> = ({ queryKey: [_, { userId, skip, take, notificationType }], signal }) => {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (take) params.append("take", String(take));
  if (notificationType) {
    notificationType.forEach((t) => params.append("notificationType", t));
  }

  return api.get(`v1/users/${userId}/notifications?${params}`, { signal });
};

export function queryNotifications(
  userId?: number,
  opts?: {
    skip?: number;
    take?: number;
    notificationType?: string[];
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
