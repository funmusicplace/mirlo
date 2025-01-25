import { css } from "@emotion/css";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import { bp } from "../../constants";
import React from "react";
import { useFormContext } from "react-hook-form";
import styled from "@emotion/styled";
import { FaFileUpload } from "react-icons/fa";
import { useTranslation } from "react-i18next";

export const Img = styled.img<{ rounded?: boolean }>`
  transition: .25s background-color, .25s filter;
  aspect-ratio: 1/1;

  &:hover {
    filter: brightness(80%);
    cursor: pointer;
  }
  @media (max-width: ${bp.medium}px) {
    max-width: 100%;
  }

  ${({ rounded }) => (rounded ? "border-radius: 100%" : "")}}
`;

export const ReplaceSpan = styled.span<{ rounded?: boolean }>`
  position: absolute;
  text-align: center;
  vertical-align: middle;
  line-height: 100%;
  width: 100%;
  height: 98.5%;
  cursor: pointer;
  padding-top: 47%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  justify-content: center;
  z-index: 999;
  display: block;
  ${({ rounded }) => (rounded ? "border-radius: 100% !important" : "")}}
`;

export const Spinner: React.FC<{ rounded?: boolean }> = ({ rounded }) => {
  return (
    <div
      className={css`
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: var(--mi-lighten-x-background-color);
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
}> = ({ width, height, rounded, imageTypeDescription }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });

  return (
    <div
      className={css`
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
        border: 1px solid var(--mi-darken-x-background-color);
        ${rounded ? "border-radius: 100%;" : ""}
        transition: .25s background-color;
        cursor: pointer;

        > svg {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        &:hover {
          background-color: var(--mi-darken-background-color);
        }
        @media (max-width: ${bp.medium}px) {
          padding: 0.2rem;
          font-size: var(--mi-font-size-small);
        }
      `}
    >
      <FaFileUpload />
      {t("clickToUploadType", { imageType: imageTypeDescription })}
    </div>
  );
};

export const ImageWrap = styled.div`
  position: relative;
  display: inline-block;
`;
