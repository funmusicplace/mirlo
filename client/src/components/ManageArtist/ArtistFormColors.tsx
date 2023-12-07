import { useTranslation } from "react-i18next";
import ColorInput from "./ColorInput";
import { css } from "@emotion/css";
import { bp } from "../../constants";

const ArtistFormColors = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  return (
    <>
      <label>{t("customColors")}</label>

      <div
        className={css`
          display: flex;
          margin-bottom: 0.75rem;

          > div {
            margin-right: 1rem;
            margin-top: 0rem;
          }

          > div > div {
            margin-right: 1rem;
            margin-top: 0.25rem;
          }

          div:last-child {
            margin-right: 0rem;
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

          @media (max-width: ${bp.medium}px) {
            flex-direction: column;

            div {
              margin-right: 0;
            }
          }
        `}
      >
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
      </div>
    </>
  );
};

export default ArtistFormColors;
