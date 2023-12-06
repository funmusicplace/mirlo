import { useTranslation } from "react-i18next";
import ColorInput from "./ColorInput";
import { css } from "@emotion/css";
import { bp } from "../../constants";

const ArtistFormColors = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  return (
    <>
      <label
        className={css`
          display: flex;
        `}
      >
        <h2>{t("customColors")}</h2>
      </label>

      <div
        className={css`
          display: flex;
          margin-bottom: 0.75rem;

          div {
            margin-right: 1rem;
            margin-top: 0;
          }

          div:last-child {
            margin-right: 0rem;
          }

          span {
            margin: 0.6rem 0.5rem 0.3rem 0rem;
            padding: 0.1rem;
            border-radius: 100px;
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
