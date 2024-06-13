import { useTranslation } from "react-i18next";
import ColorInput from "./ColorInput";
import { css } from "@emotion/css";
import React from "react";
import styled from "@emotion/styled";

const ColorInputWrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  margin-bottom: 0.75rem;

  > div {
    margin-right: 1rem;
    margin-top: 1rem;
  }

  > div > div {
    margin-right: 1rem;
    margin-top: 0.25rem;
  }

  div:last-child {
    margin-right: 0rem;
    width: 100%;
  }

  span {
    margin: 0rem 0.5rem 0rem 0rem;
    padding: 1.5rem;
    height: auto;
    width: 2rem;
    border-radius: 100px;
  }

  input {
    margin-top: 0rem !important;
  }

  div {
    margin-right: 0;
  }
`;

const ArtistFormColors: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });

  return (
    <>
      <label>{t("customColors")}</label>

      <ColorInputWrapper className={css``}>
        <ColorInput
          name="properties.colors.primary"
          title={t("primaryColor")}
        />
        <ColorInput
          name="properties.colors.secondary"
          title={t("secondaryColor")}
        />
        <ColorInput
          name="properties.colors.background"
          title={t("backgroundColor")}
        />
        <ColorInput
          name="properties.colors.foreground"
          title={t("foregroundColor")}
        />
      </ColorInputWrapper>
    </>
  );
};

export default ArtistFormColors;
