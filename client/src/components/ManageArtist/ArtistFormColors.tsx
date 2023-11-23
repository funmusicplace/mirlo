import { useTranslation } from "react-i18next";
import ColorInput from "./ColorInput";
import { css } from "@emotion/css";

const ArtistFormColors = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  return (
    <>
      <label>
        <strong>{t("customColors")}</strong>
      </label>

      <div
        className={css`
          display: flex;
          margin-top: 0.5rem;
          margin-bottom: 0.75rem;
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
