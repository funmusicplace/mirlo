import styled from "@emotion/styled";
import React from "react";

import UserBoughtYourAlbum from "./UserBoughtYourAlbum";
import NewArtistPost from "./NewArtistPost";
import NewArtistAlbum from "./NewArtistAlbum";
import UserFollowedYou from "./UserFollowedYou";
import FundraiserPledge from "./FundraiserPledge";
import LabelInvite from "./LabelInvite";

const categoryBorderColor = (type: Notification["notificationType"]) => {
  switch (type) {
    case "NEW_ARTIST_ALBUM":
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
  background-color: ${(props) =>
    props.compact
      ? `rgba(255, 255, 255, 0.5)`
      : props.isRead
        ? `rgba(0, 0, 0, 0.01)`
        : `rgba(0, 0, 0, 0.025)`};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  margin-bottom: 0.75rem;
  position: relative;
  overflow: hidden;
  border-left: 3px solid
    ${(props) => categoryBorderColor(props.notificationType)};
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
      {notification.notificationType === "NEW_ARTIST_ALBUM" && (
        <NewArtistAlbum notification={notification} />
      )}
      {notification.notificationType === "LABEL_ADDED_ARTIST" && (
        <LabelInvite notification={notification} />
      )}
    </LI>
  );
};

export default NotificationFeedItem;
