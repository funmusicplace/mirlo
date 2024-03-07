import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { WidthWrapper } from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";

import UserBoughtYourAlbum from "./UserBoughtYourAlbum";
import NewArtistPost from "./NewArtistPost";
import NewArtistAlbum from "./NewArtistAlbum";

const LI = styled.li<{ isRead: boolean }>`
  background-color: ${(props) =>
    props.isRead
      ? `var(--mi-background-color)`
      : `var(--mi-lighten-x-background-color)`};
  transition: background 0.5s;
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
`;

const UserNotificationFeed = () => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const hoverRef = React.useRef<NodeJS.Timeout>();
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;

  const fetchNotifications = React.useCallback(
    async (id: number | undefined) => {
      if (id) {
        const response = await api.getMany<Notification>(
          `users/${id}/notifications`
        );
        setNotifications(response.results);
      }
    },
    []
  );

  const markNotificationAsRead = React.useCallback(
    (id: string) => {
      const timeout = setTimeout(async () => {
        await api.put(`users/${userId}/notifications/${id}`, {});
        fetchNotifications(userId);
      }, 2000);
      hoverRef.current = timeout;
    },
    [fetchNotifications, userId]
  );

  React.useEffect(() => {
    fetchNotifications(userId);
  }, [fetchNotifications, userId]);

  return (
    <WidthWrapper
      variant="medium"
      className={css`
        padding-top: 2rem;
      `}
    >
      <h2>{t("notifications")}</h2>
      <ul
        className={css`
          list-style: none;
        `}
      >
        {notifications.map((notification) => (
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
            {notification.notificationType === "NEW_ARTIST_POST" && (
              <NewArtistPost notification={notification} />
            )}
            {notification.notificationType === "NEW_ARTIST_ALBUM" && (
              <NewArtistAlbum notification={notification} />
            )}
          </LI>
        ))}
      </ul>
    </WidthWrapper>
  );
};

export default UserNotificationFeed;
