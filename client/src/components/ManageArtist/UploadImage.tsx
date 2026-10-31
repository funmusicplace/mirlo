import { css } from "@emotion/css";
import LoadingSpinner from "components/common/LoadingSpinner";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaFileUpload } from "react-icons/fa";

import { bp } from "../../constants";

export const Spinner: React.FC<{ rounded?: boolean }> = ({ rounded }) => {
  return (
    <div
      className={css`
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: var(--mi-tint-x-color);
        display: flex;
        align-items: center;
        justify-content: center;
        top: 0;
        right: 0;
        left: 0;
        ${rounded ? "border-radius: 100%" : ""}
      `}
    >
      <LoadingSpinner
        className={css`
          font-size: 2rem;
        `}
      />
    </div>
  );
};

export const UploadPrompt: React.FC<{
  width?: string;
  height?: string;
  rounded?: boolean;
  imageTypeDescription?: string;
  className?: string;
}> = ({ width, height, rounded, imageTypeDescription, className }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });

  return (
    <div
      className={
        css`
          flex-direction: column;
          padding: 1rem;
          text-align: center;
          font-size: 1rem;
          aspect-ratio: 1 / 1;
          background: radial-gradient(
            circle,
            rgba(96, 96, 96, 0.1) 3%,
            rgba(125, 125, 125, 0.25) 90%
          );
          width: ${width};
          height: ${height};
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--mi-tint-x-color);
          ${rounded ? "border-radius: 100%;" : ""}
          transition: .25s background-color;
          cursor: pointer;

          > svg {
            font-size: 2rem;
            margin-bottom: 1rem;
          }

          &:hover {
            background-color: var(--mi-tint-color);
          }
          @media (max-width: ${bp.medium}px) {
            padding: 0.2rem;
            font-size: var(--mi-font-size-small);
          }
        ` + ` ${className ?? ""}`
      }
    >
      <FaFileUpload />
      {t("clickToUploadType", { imageType: imageTypeDescription })}
    </div>
  );
};
