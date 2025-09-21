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

import LabelInvite from "./LabelInvite";
import { set } from "lodash";

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
  position: relative;

  @keyframes roundtime {
    to {
      transform: scaleX(0);
    }
  }

  .bar {
    position: absolute;
    height: 0.25rem;
    width: 100%;
    background-color: var(--mi-primary-color);
    bottom: 0;
    border-radius: 4px;
    transition: opacity 0.3s;

    transform-origin: left center;
    animation: roundtime calc(2.5s) linear forwards;
  }
`;

const NotificationFeedItem: React.FC<{
  notification: Notification;
  refetch: () => void;
}> = ({ notification, refetch }) => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  const hoverRef = React.useRef<NodeJS.Timeout>();
  const [isHovering, setIsHovering] = React.useState(false);
  const { user } = useAuthContext();

  const userId = user?.id;

  const markNotificationAsRead = React.useCallback(
    (id: string) => {
      setIsHovering(true);
      const timeout = setTimeout(async () => {
        await api.put(`users/${userId}/notifications/${id}`, {});
        refetch();
        setIsHovering(false);
      }, 2500);
      hoverRef.current = timeout;
    },
    [userId]
  );

  return (
    <LI
      onMouseEnter={() => markNotificationAsRead(notification.id)}
      onMouseLeave={() => {
        if (hoverRef.current) {
          clearTimeout(hoverRef.current);
          setIsHovering(false);
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
      {notification.notificationType === "LABEL_ADDED_ARTIST" && (
        <LabelInvite notification={notification} />
      )}
      <div className={!notification.isRead && isHovering ? "bar" : ""}></div>
    </LI>
  );
};

export default NotificationFeedItem;
