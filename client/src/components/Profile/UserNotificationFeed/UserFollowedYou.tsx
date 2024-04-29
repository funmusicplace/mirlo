import React from "react";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

const UserFollowedYou: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  if (!notification.relatedUser) {
    return null;
  }
  return (
    <>
      <div>
        {notification.relatedUser?.name} followed your artist:{" "}
        {notification.artist && (
          <Link to={getArtistUrl(notification.artist)}>
            {notification.artist?.name}
          </Link>
        )}{" "}
        {notification.subscription && (
          <>at {notification.subscription?.artistSubscriptionTier.name}</>
        )}
      </div>
    </>
  );
};

export default UserFollowedYou;
