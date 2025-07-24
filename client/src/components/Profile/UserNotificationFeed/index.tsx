import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { WidthWrapper } from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";

import UserBoughtYourAlbum from "./UserBoughtYourAlbum";
import NewArtistPost from "./NewArtistPost";
import NewArtistAlbum from "./NewArtistAlbum";
import UserFollowedYou from "./UserFollowedYou";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryNotifications } from "queries/notifications";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import usePagination from "utils/usePagination";

const LI = styled.li<{ isRead: boolean }>`
  background-color: ${(props) =>
    props.isRead
      ? `var(--mi-background-color)`
      : `var(--mi-darken-background-color)`};
  transition: background 0.5s;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
`;
const pageSize = 30;

const UserNotificationFeed = () => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const hoverRef = React.useRef<NodeJS.Timeout>();
  const { user } = useAuthContext();
  const { page, PaginationComponent } = usePagination({ pageSize });
  const {
    data: notifications,
    refetch,
    isPending,
  } = useQuery(
    queryNotifications(user?.id, { skip: pageSize * page, take: pageSize })
  );

  const userId = user?.id;

  const markNotificationAsRead = React.useCallback(
    (id: string) => {
      const timeout = setTimeout(async () => {
        await api.put(`users/${userId}/notifications/${id}`, {});
        refetch();
      }, 1000);
      hoverRef.current = timeout;
    },
    [userId]
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
          <LI
            key={notification.id}
            onMouseEnter={() => markNotificationAsRead(notification.id)}
            onMouseLeave={() => {
              if (hoverRef.current) {
                clearTimeout(hoverRef.current);
              }
            }}
            isRead={notification.isRead}
          >
            {notification.notificationType === "USER_BOUGHT_YOUR_ALBUM" && (
              <UserBoughtYourAlbum notification={notification} />
            )}
            {notification.notificationType === "USER_FOLLOWED_YOU" && (
              <UserFollowedYou notification={notification} />
            )}
            {notification.notificationType === "USER_SUBSCRIBED_TO_YOU" && (
              <UserFollowedYou notification={notification} />
            )}
            {notification.notificationType === "NEW_ARTIST_POST" && (
              <NewArtistPost notification={notification} />
            )}
            {notification.notificationType === "NEW_ARTIST_ALBUM" && (
              <NewArtistAlbum notification={notification} />
            )}
          </LI>
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
