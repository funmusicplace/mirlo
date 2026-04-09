import { css } from "@emotion/css";
import { WidthWrapper } from "components/common/WidthContainer";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  markAllNotificationsRead,
  queryNotifications,
} from "queries/notifications";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import usePagination from "utils/usePagination";
import NotificationFeedItem from "./NotificationFeedItem";
import React from "react";

const pageSize = 30;

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

const FilterGroup: React.FC<{
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}> = ({ legend, name, options, value, onChange, compact }) => (
  <fieldset className="border-none p-0 m-0 mb-4">
    <legend className="sr-only">{legend}</legend>
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <label key={opt.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only peer"
          />
          <span
            className={[
              "inline-block rounded-full border transition-colors select-none peer-focus-visible:ring-2 peer-focus-visible:ring-(--mi-primary-color) peer-focus-visible:ring-offset-1",
              compact ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
              value === opt.value
                ? "border-(--mi-primary-color) text-(--mi-primary-color) font-semibold"
                : "border-(--mi-darken-x-background-color) text-(--mi-light-foreground-color) hover:text-(--mi-normal-foreground-color) hover:border-(--mi-normal-foreground-color)",
            ].join(" ")}
          >
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

const NotificationColumn: React.FC<{
  title: string;
  userId: number;
  baseTypes: Notification["notificationType"][];
  filterOptions: {
    value: string;
    label: string;
    types: Notification["notificationType"][];
    checkExists?: boolean;
  }[];
  filterName: string;
  compact?: boolean;
}> = ({ title, userId, baseTypes, filterOptions, filterName, compact }) => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const [filter, setFilter] = React.useState("all");
  const { page, resetPage, PaginationComponent } = usePagination({
    pageSize,
    pageParam: filterName,
  });

  // Conditional options need individual existence checks (can't call hooks in a loop)
  const cOpts = filterOptions.filter((o) => o.checkExists);
  const cOpt0 = cOpts[0];
  const cOpt1 = cOpts[1];

  const { data: cData0 } = useQuery({
    ...queryNotifications(userId, {
      take: 1,
      notificationType: cOpt0?.types ?? [],
    }),
    enabled: !!cOpt0,
  });
  const { data: cData1 } = useQuery({
    ...queryNotifications(userId, {
      take: 1,
      notificationType: cOpt1?.types ?? [],
    }),
    enabled: !!cOpt1,
  });

  const existenceMap = new Map<string, boolean>([
    ...(cOpt0
      ? ([[cOpt0.value, (cData0?.total ?? 0) > 0]] as [string, boolean][])
      : []),
    ...(cOpt1
      ? ([[cOpt1.value, (cData1?.total ?? 0) > 0]] as [string, boolean][])
      : []),
  ]);

  const visibleFilterOptions = filterOptions.filter((o) =>
    o.checkExists ? (existenceMap.get(o.value) ?? false) : true
  );

  const activeTypes =
    filter === "all"
      ? baseTypes
      : (filterOptions.find((o) => o.value === filter)?.types ?? baseTypes);

  const { data, isPending } = useQuery(
    queryNotifications(userId, {
      skip: pageSize * page,
      take: pageSize,
      notificationType: activeTypes,
    })
  );

  const results = data?.results ?? [];

  const unreadIdsAtMount = React.useRef<Set<string> | null>(null);
  if (unreadIdsAtMount.current === null && data) {
    unreadIdsAtMount.current = new Set(
      results.filter((n) => !n.isRead).map((n) => n.id)
    );
  }

  React.useEffect(() => {
    unreadIdsAtMount.current = null;
  }, [filter]);

  const separatorIndex = unreadIdsAtMount.current
    ? results.findIndex((n) => !unreadIdsAtMount.current!.has(n.id))
    : -1;

  const options = [
    { value: "all", label: t("filterAll") },
    ...visibleFilterOptions,
  ];

  return (
    <div className="flex-1 min-w-0">
      {compact ? (
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-(--mi-light-foreground-color) mb-3">
          {title}
        </p>
      ) : (
        <h2 className="text-lg font-bold text-(--mi-normal-foreground-color) mb-3">
          {title}
        </h2>
      )}
      <FilterGroup
        legend={t("filterLegend", { column: title })}
        name={filterName}
        options={options}
        value={filter}
        onChange={(value) => {
          setFilter(value);
          resetPage();
        }}
        compact={compact}
      />
      {isPending && (
        <LoadingBlocks height={compact ? "3rem" : "4rem"} rows={5} />
      )}
      <ul className="list-none">
        {results.map((notification, index) => (
          <React.Fragment key={notification.id}>
            {separatorIndex > 0 && index === separatorIndex && (
              <li className="flex items-center gap-3 my-6 text-sm text-(--mi-light-foreground-color)">
                <div className="flex-1 h-px bg-(--mi-darken-x-background-color)" />
                <span>{t("earlierNotifications")}</span>
                <div className="flex-1 h-px bg-(--mi-darken-x-background-color)" />
              </li>
            )}
            <NotificationFeedItem
              notification={notification}
              compact={compact}
            />
          </React.Fragment>
        ))}
        {!isPending && results.length === 0 && (
          <li className="text-sm text-(--mi-light-foreground-color) py-4">
            {t("noNotifications")}
          </li>
        )}
      </ul>
      <PaginationComponent amount={results.length} total={data?.total} />
    </div>
  );
};

const UserNotificationFeed = () => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const { user } = useAuthContext();

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
      <div className="flex gap-8 items-start">
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

        <div
          id="activity-column"
          className="shrink-0 w-1/3 rounded-xl bg-(--mi-darken-background-color) p-4"
        >
          <NotificationColumn
            title={t("timelineActivity")}
            userId={user.id}
            baseTypes={ACTIVITY_TYPES}
            filterName="activity-filter"
            filterOptions={[
              {
                value: "followers",
                label: t("categoryFollowers"),
                types: ["USER_FOLLOWED_YOU", "USER_SUBSCRIBED_TO_YOU"],
              },
              {
                value: "purchases",
                label: t("categoryPurchases"),
                types: ["USER_BOUGHT_YOUR_ALBUM", "USER_BOUGHT_YOUR_TRACK"],
              },
              {
                value: "pledges",
                label: t("categoryPledges"),
                types: ["FUNDRAISER_PLEDGE_CHARGED"],
                checkExists: true,
              },
              {
                value: "labels",
                label: t("categoryLabels"),
                types: ["LABEL_ADDED_ARTIST"],
                checkExists: true,
              },
            ]}
            compact
          />
        </div>
      </div>
    </WidthWrapper>
  );
};

export default UserNotificationFeed;
