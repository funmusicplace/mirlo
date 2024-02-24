import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { WidthWrapper } from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import {
  getArtistUrlReference,
  getPostURLReference,
  getReleaseUrl,
} from "utils/artist";

type Notification = {
  content: string;
  id: string;
  notificationType: "NEW_ARTIST_POST" | "NEW_ARTIST_ALBUM";
  post?: Post;
  trackGroup: TrackGroup & { artist: Artist };
};

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
            {notification.notificationType === "NEW_ARTIST_POST" &&
              notification.post && (
                <>
                  <div>
                    New post by{" "}
                    {notification.post.artist && (
                      <Link
                        to={getArtistUrlReference(notification.post.artist)}
                      >
                        {notification.post.artist?.name}
                      </Link>
                    )}
                    : <strong>{notification.post.title}</strong>
                  </div>
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
              )}
            {notification.notificationType === "NEW_ARTIST_ALBUM" &&
              notification.trackGroup && (
                <>
                  <div>
                    New album by{" "}
                    {notification.trackGroup.artist && (
                      <Link
                        to={getArtistUrlReference(
                          notification.trackGroup.artist
                        )}
                      >
                        {notification.trackGroup.artist?.name}
                      </Link>
                    )}
                    : <strong>{notification.trackGroup.title}</strong>
                  </div>
                  <Link
                    to={getReleaseUrl(
                      notification.trackGroup.artist,
                      notification.trackGroup
                    )}
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
              )}
          </LI>
        ))}
      </ul>
    </WidthWrapper>
  );
};

export default UserNotificationFeed;
