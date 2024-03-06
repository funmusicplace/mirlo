import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistUrlReference, getTrackGroupUrlReference } from "utils/artist";

const UserBoughtYourAlbum: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });

  if (!notification.trackGroup) {
    return null;
  }
  return (
    <>
      <div>
        {notification.relatedUser?.name} bought your album:{" "}
        {notification.trackGroup.artist && (
          <Link to={getArtistUrlReference(notification.trackGroup.artist)}>
            {notification.trackGroup.artist?.name}
          </Link>
        )}
        : <strong>{notification.trackGroup.title}</strong>
      </div>
      <Link
        to={getTrackGroupUrlReference(notification.trackGroup)}
        className={css`
          display: flex;
          align-items: center;
          margin-top: 0.5rem;

          svg {
            margin-left: 0.25rem;
          }
        `}
      >
        {t("viewAlbum")} <FaChevronRight />
      </Link>
    </>
  );
};

export default UserBoughtYourAlbum;
