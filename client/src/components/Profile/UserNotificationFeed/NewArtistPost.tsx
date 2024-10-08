import { css } from "@emotion/css";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistUrl, getPostURLReference } from "utils/artist";

const NewArtistPost: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });

  if (!notification.post) {
    return null;
  }

  const artist = notification.post.artist;
  return (
    <>
      {artist && (
        <div>
          <Trans
            t={t}
            i18nKey="newPostByArtist"
            values={{ artistName: artist?.name }}
            components={{
              link: <Link to={getArtistUrl(artist)}></Link>,
            }}
          />
          : <strong>{notification.post.title}</strong>
        </div>
      )}
      <Link
        to={getPostURLReference(notification.post)}
        className={css`
          display: flex;
          align-items: center;
          margin-top: 0.5rem;

          svg {
            margin-left: 0.25rem;
          }
        `}
      >
        {t("readPost")} <FaChevronRight />
      </Link>
    </>
  );
};

export default NewArtistPost;
