import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

const UserFollowedYou: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });
  if (!notification.relatedUser) {
    return null;
  }
  return (
    <>
      <div>
        {t("followedYourArtist", {
          relatedUser:
            notification.relatedUser?.name ?? notification.relatedUser?.email,
        })}
        {": "}
        {notification.artist && (
          <Link to={getArtistUrl(notification.artist)}>
            {notification.artist?.name}
          </Link>
        )}{" "}
        {notification.subscription &&
          t("atSubscriptionTier", {
            subscriptionTier:
              notification.subscription?.artistSubscriptionTier.name,
          })}
      </div>
    </>
  );
};

export default UserFollowedYou;
