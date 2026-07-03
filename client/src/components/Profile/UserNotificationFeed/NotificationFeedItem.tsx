import styled from "@emotion/styled";
import React from "react";

import ArtistContactMessage from "./ArtistContactMessage";
import FundraiserPledge from "./FundraiserPledge";
import LabelInvite from "./LabelInvite";
import NewArtistAlbum from "./NewArtistAlbum";
import NewArtistPost from "./NewArtistPost";
import UserBoughtYourAlbum from "./UserBoughtYourAlbum";
import UserFollowedYou from "./UserFollowedYou";

const categoryBorderColor = (type: Notification["notificationType"]) => {
  switch (type) {
    case "NEW_ARTIST_ALBUM":
    case "NEW_ARTIST_PREORDER":
      return "#BE3455"; // Red 500
    case "NEW_ARTIST_POST":
      return "#5C899C"; // Blue
    default:
      return "transparent";
  }
};

const LI = styled.li<{
  isRead: boolean;
  notificationType: Notification["notificationType"];
  compact?: boolean;
}>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  margin-bottom: 0.75rem;
  position: relative;
  overflow: hidden;

  ${(props) =>
    props.compact
      ? `
    background-color: var(--mi-background-color);
    box-shadow: none;
    border: 1px solid var(--mi-notification-item-border-color);
  `
      : `
    background-color: ${
      props.isRead
        ? "var(--mi-darken-background-color)"
        : "var(--mi-tint-color)"
    };
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    border: none;
    border-left: 3px solid ${categoryBorderColor(props.notificationType)};
  `}
`;

const NotificationFeedItem: React.FC<{
  notification: Notification;
  compact?: boolean;
}> = ({ notification, compact }) => {
  return (
    <LI
      isRead={notification.isRead}
      notificationType={notification.notificationType}
      compact={compact}
    >
      {notification.notificationType === "USER_BOUGHT_YOUR_ALBUM" && (
        <UserBoughtYourAlbum notification={notification} compact={compact} />
      )}
      {notification.notificationType === "USER_BOUGHT_YOUR_TRACK" && (
        <UserBoughtYourAlbum notification={notification} compact={compact} />
      )}
      {notification.notificationType === "FUNDRAISER_PLEDGE_CHARGED" && (
        <FundraiserPledge notification={notification} compact={compact} />
      )}
      {notification.notificationType === "USER_FOLLOWED_YOU" && (
        <UserFollowedYou notification={notification} compact={compact} />
      )}
      {notification.notificationType === "USER_SUBSCRIBED_TO_YOU" && (
        <UserFollowedYou notification={notification} compact={compact} />
      )}
      {notification.notificationType === "NEW_ARTIST_POST" && (
        <NewArtistPost notification={notification} />
      )}
      {(notification.notificationType === "NEW_ARTIST_ALBUM" ||
        notification.notificationType === "NEW_ARTIST_PREORDER") && (
        <NewArtistAlbum notification={notification} />
      )}
      {notification.notificationType === "LABEL_ADDED_ARTIST" && (
        <LabelInvite notification={notification} compact={compact} />
      )}
      {notification.notificationType === "ARTIST_CONTACT_MESSAGE" && (
        <ArtistContactMessage notification={notification} compact={compact} />
      )}
    </LI>
  );
};

export default NotificationFeedItem;
