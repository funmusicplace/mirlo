import { css } from "@emotion/css";
import UploadArtistImage from "components/ManageArtist/UploadArtistImage";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";

const ProfileImages: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user } = useAuthContext();

  if (!user) {
    return null;
  }

  return (
    <>
      <div
        className={css`
          > div {
            flex-direction: row;
            max-width: 100%;
            align-items: center;

            img {
              width: 10rem;
            }

            > div {
              padding: 0 1rem;
            }

            div:last-child {
              width: auto !important;
            }
          }
        `}
      >
        <h2>{t("yourAvatar")}</h2>

        <UploadArtistImage
          existing={user}
          imageTypeDescription={t("yourAvatar")}
          imageType="avatar"
          height="auto"
          width="100%"
          maxDimensions="1500x1500"
          maxSize="15mb"
        />
      </div>
      <div
        className={css`
          > div {
            flex-direction: row;
            max-width: 100%;
            align-items: center;

            img {
              width: 10rem;
            }

            > div {
              padding: 0 1rem;
            }

            div:last-child {
              width: auto !important;
            }
          }
        `}
      >
        <h2>{t("yourBanner")}</h2>
        <UploadArtistImage
          existing={user}
          imageTypeDescription={t("yourBanner")}
          imageType="banner"
          height="auto"
          width="100%"
          maxDimensions="1500x1500"
          maxSize="15mb"
        />
      </div>
    </>
  );
};

export default ProfileImages;
