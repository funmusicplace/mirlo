import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { queryNotifications } from "queries/notifications";
import React from "react";
import { useTranslation } from "react-i18next";
import usePagination from "utils/usePagination";
import FilterGroup from "./FilterGroup";
import NotificationFeedItem from "./NotificationFeedItem";

const pageSize = 30;

const NotificationColumn: React.FC<{
  title: string;
  userId: number;
  baseTypes: Notification["notificationType"][];
  filterOptions: {
    value: string;
    label: string;
    types: Notification["notificationType"][];
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

  const options = [{ value: "all", label: t("filterAll") }, ...filterOptions];

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

export default NotificationColumn;
