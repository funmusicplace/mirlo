import { css } from "@emotion/css";
import styled from "@emotion/styled";
import React from "react";
import { useTranslation } from "react-i18next";

export const PercentUpload = styled("div")<{ percentUpload: number }>`
  position: absolute;
  height: 5px;
  bottom: 0;
  opacity: 0.5;
  transition: 0.2s width;
  width: ${(props) => props.percentUpload ?? 0}%;
  ${(props) =>
    props.percentUpload !== 100
      ? `
    animation: 3s shine linear infinite;
    background: linear-gradient(
      110deg,
      var(--mi-button-color) 33%,
      #ec7c98 33%,
      #ec7c98 38%,
      var(--mi-button-color) 39%,
      var(--mi-button-color) 66%,
      #ec7c98 66%,
      #ec7c98 76%,
      var(--mi-button-color) 76%
    );
    background-size: 200% 100%;

    @keyframes shine {
      to {
        background-position-x: -200%;
      }
    }`
      : `
    background-color: var(--mi-success-background-color)`}
`;

export const BulkTrackUploadRow: React.FC<{
  track: { title: string; status: number; image?: string };
}> = ({ track }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  return (
    <div
      className={css`
        position: relative;
        margin-bottom: 0.2rem;
        background: var(--mi-tint-color);
        display: flex;
        align-items: center;
        gap: 0.75rem;
      `}
    >
      <PercentUpload percentUpload={track.status} />
      {track.image && (
        <img
          src={track.image}
          alt={track.title}
          className={css`
            width: 40px;
            height: 40px;
            object-fit: cover;
            border-radius: 4px;
            flex-shrink: 0;
            position: relative;
            z-index: 1;
          `}
        />
      )}
      <div
        className={css`
          padding: 0.5rem 1rem;
          position: relative;
          z-index: 1;
          flex: 1;
        `}
      >
        {t("uploading", { title: track.title })}
      </div>
    </div>
  );
};
