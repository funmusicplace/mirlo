import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { useTranslation } from "react-i18next";

import ColorInput from "./ColorInput";

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
        <ColorInput name="properties.colors.button" title={t("buttonColor")} />
        <ColorInput
          name="properties.colors.buttonText"
          title={t("buttonTextColor")}
        />
        <ColorInput
          name="properties.colors.background"
          title={t("backgroundColor")}
        />
        <ColorInput
          name="properties.colors.text"
          title={t("textColor")}
        />
      </ColorInputWrapper>
      <div>
        <ArtistButton
          rounded
          type="button"
          onClick={() => {
            window.setTimeout(() => {
              window.location.reload();
            });
          }}
        >
          {t("refreshPage")}
        </ArtistButton>
      </div>
    </>
  );
};

export default ArtistFormColors;
