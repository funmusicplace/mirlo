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

const LI = styled.li`
  background-color: var(--mi-lighten-x-background-color);
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
`;

const UserNotificationFeed = () => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;
  React.useEffect(() => {
    const callback = async () => {
      const response = await api.getMany<Notification>(
        `users/${userId}/notifications`
      );
      setNotifications(response.results);
    };

    callback();
  }, [userId]);
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
          <LI key={notification.id}>
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
