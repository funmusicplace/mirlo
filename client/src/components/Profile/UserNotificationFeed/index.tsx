import { css } from "@emotion/css";
import { WidthWrapper } from "components/common/WidthContainer";
import { useTranslation } from "react-i18next";

import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryNotifications } from "queries/notifications";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import usePagination from "utils/usePagination";
import NotificationFeedItem from "./NotificationFeedItem";

const pageSize = 30;

const UserNotificationFeed = () => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const { user } = useAuthContext();
  const { page, PaginationComponent } = usePagination({ pageSize });
  const {
    data: notifications,
    refetch,
    isPending,
  } = useQuery(
    queryNotifications(user?.id, { skip: pageSize * page, take: pageSize })
  );

  return (
    <WidthWrapper
      variant="medium"
      className={css`
        padding-top: 2rem;
      `}
    >
      <h2>{t("notifications")}</h2>
      {isPending && <LoadingBlocks height="4rem" rows={5} />}
      <ul
        className={css`
          list-style: none;
        `}
      >
        {notifications?.results.map((notification) => (
          <NotificationFeedItem
            key={notification.id}
            notification={notification}
            refetch={refetch}
          />
        ))}
      </ul>
      <PaginationComponent
        amount={notifications?.results.length}
        total={notifications?.total}
      />
    </WidthWrapper>
  );
};

export default UserNotificationFeed;
