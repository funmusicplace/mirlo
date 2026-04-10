import { css } from "@emotion/css";
import { WidthWrapper } from "components/common/WidthContainer";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  markAllNotificationsRead,
  queryNotifications,
} from "queries/notifications";
import React from "react";
import NotificationColumn from "./NotificationColumn";

const FOLLOW_TYPES: Notification["notificationType"][] = [
  "NEW_ARTIST_ALBUM",
  "NEW_ARTIST_POST",
];

const ACTIVITY_TYPES: Notification["notificationType"][] = [
  "USER_FOLLOWED_YOU",
  "USER_SUBSCRIBED_TO_YOU",
  "USER_BOUGHT_YOUR_ALBUM",
  "USER_BOUGHT_YOUR_TRACK",
  "LABEL_ADDED_ARTIST",
  "FUNDRAISER_PLEDGE_CHARGED",
];

const hasNotifications = (data: { total?: number } | undefined): boolean =>
  (data?.total ?? 0) > 0;

const UserNotificationFeed = () => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const { user } = useAuthContext();

  const { data: followerCheck } = useQuery({
    ...queryNotifications(user?.id, {
      take: 1,
      notificationType: ["USER_FOLLOWED_YOU", "USER_SUBSCRIBED_TO_YOU"],
    }),
    enabled: !!user?.id,
  });

  const { data: purchaseCheck } = useQuery({
    ...queryNotifications(user?.id, {
      take: 1,
      notificationType: ["USER_BOUGHT_YOUR_ALBUM", "USER_BOUGHT_YOUR_TRACK"],
    }),
    enabled: !!user?.id,
  });

  const { data: pledgeCheck } = useQuery({
    ...queryNotifications(user?.id, {
      take: 1,
      notificationType: ["FUNDRAISER_PLEDGE_CHARGED"],
    }),
    enabled: !!user?.id,
  });

  const { data: labelCheck } = useQuery({
    ...queryNotifications(user?.id, {
      take: 1,
      notificationType: ["LABEL_ADDED_ARTIST"],
    }),
    enabled: !!user?.id,
  });

  const activityFilterOptions = [
    ...(hasNotifications(followerCheck)
      ? [
          {
            value: "followers",
            label: t("categoryFollowers"),
            types: [
              "USER_FOLLOWED_YOU",
              "USER_SUBSCRIBED_TO_YOU",
            ] as Notification["notificationType"][],
          },
        ]
      : []),
    ...(hasNotifications(purchaseCheck)
      ? [
          {
            value: "purchases",
            label: t("categoryPurchases"),
            types: [
              "USER_BOUGHT_YOUR_ALBUM",
              "USER_BOUGHT_YOUR_TRACK",
            ] as Notification["notificationType"][],
          },
        ]
      : []),
    ...(hasNotifications(pledgeCheck)
      ? [
          {
            value: "pledges",
            label: t("categoryPledges"),
            types: [
              "FUNDRAISER_PLEDGE_CHARGED",
            ] as Notification["notificationType"][],
          },
        ]
      : []),
    ...(hasNotifications(labelCheck)
      ? [
          {
            value: "labels",
            label: t("categoryLabels"),
            types: ["LABEL_ADDED_ARTIST"] as Notification["notificationType"][],
          },
        ]
      : []),
  ];

  React.useEffect(() => {
    if (!user?.id) return;
    return () => {
      markAllNotificationsRead(user.id);
    };
  }, [user?.id]);

  if (!user?.id) return null;

  return (
    <WidthWrapper
      variant="big"
      className={css`
        padding-top: 0.5rem;
      `}
    >
      <a
        href="#activity-column"
        className="sr-only focus:not-sr-only focus:block focus:mb-2 focus:px-3 focus:py-1.5 focus:text-sm focus:bg-(--mi-darken-background-color) focus:text-(--mi-normal-foreground-color) focus:rounded focus:outline-2 focus:outline-(--mi-primary-color)"
      >
        {t("skipToActivity")}
      </a>
      <div className="flex flex-wrap md:flex-nowrap gap-8 items-start p-4">
        <div className="w-full md-flex">
          <NotificationColumn
            title={t("timelineFollowing")}
            userId={user.id}
            baseTypes={FOLLOW_TYPES}
            filterName="follow-filter"
            filterOptions={[
              {
                value: "albums",
                label: t("categoryAlbums"),
                types: ["NEW_ARTIST_ALBUM"],
              },
              {
                value: "posts",
                label: t("categoryPosts"),
                types: ["NEW_ARTIST_POST"],
              },
            ]}
          />
        </div>

        <div
          id="activity-column"
          className="md:shrink-0 md:w-1/3 rounded-xl bg-(--mi-darken-background-color) p-4 w:full"
        >
          <NotificationColumn
            title={t("timelineActivity")}
            userId={user.id}
            baseTypes={ACTIVITY_TYPES}
            filterName="activity-filter"
            filterOptions={activityFilterOptions}
            compact
          />
        </div>
      </div>
    </WidthWrapper>
  );
};

export default UserNotificationFeed;
