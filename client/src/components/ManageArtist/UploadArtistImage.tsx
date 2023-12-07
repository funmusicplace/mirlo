import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";

import UploadImage from "./UploadImage";

const UploadArtistImage: React.FC<{
  existing: Artist;
  imageType: "avatar" | "banner";
  reload: () => Promise<void>;
  height: string;
  width: string;
  maxDimensions: string;
  isLoading?: boolean;
}> = ({ existing, imageType, height, width, maxDimensions, isLoading }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });

  const imageUrl =
    imageType === "banner"
      ? existing?.banner?.sizes?.[625]
      : existing?.avatar?.sizes?.[300];

  return (
    <div
      className={css`
        height: 100%;
        margin-bottom: 1rem;
      `}
    >
      <div
        className={css`
          margin-bottom: 0.5rem;
        `}
      >
        <label>{t(imageType)}</label>
      </div>
      <div
        className={css`
          position: relative;
          width: ${width};
          min-height: ${height};
          margin-bottom: 0.5rem;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: flex-start;
            flex-wrap: wrap;
            img {
              margin-right: 1rem;
              flex: 45%;
              width: 100%;
            }
            input {
              flex: 45%;
              width: 45%;
            }
          `}
        >
          <UploadImage
            formName={imageType}
            existingCover={imageUrl}
            updatedAt={existing[imageType]?.updatedAt}
            isLoading={isLoading}
          />
          <small
            className={css`
              width: 100%;
              flex: 100%;
              margin-top: 0.5rem;
            `}
          >
            {t("dimensionsTip", { maxDimensions })}
          </small>
        </div>
      </div>
    </div>
  );
};

export default UploadArtistImage;
