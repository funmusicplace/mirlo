import React from "react";
import { useTranslation } from "react-i18next";

const SetupPreview: React.FC<{ name: string }> = ({ name }) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });

  return (
    <div
      aria-hidden="true"
      className="mt-10 overflow-hidden rounded-md border border-(--mi-tint-x-color)"
    >
      <div className="flex h-10 items-center gap-4 border-b border-(--mi-tint-x-color) px-4">
        <span
          className={
            name ? "truncate font-black" : "truncate italic opacity-60"
          }
        >
          {name || t("previewPlaceholder")}
        </span>
        <span className="ml-auto shrink-0 rounded-(--mi-border-radius) bg-(--mi-button-color) px-2 py-1 text-xs font-semibold text-(--mi-button-text-color)">
          {t("previewLogIn")}
        </span>
      </div>
      <div className="flex items-center gap-2 bg-(--mi-tint-color) px-4 py-3 text-sm">
        <span className="h-12 w-12 rounded-(--mi-border-radius) bg-(--mi-tint-x-color)" />
        <span className="h-12 w-12 rounded-(--mi-border-radius) bg-(--mi-tint-x-color)" />
        <span className="h-12 w-12 rounded-(--mi-border-radius) bg-(--mi-tint-x-color)" />
        <span className="opacity-60">{t("previewReleases")}</span>
      </div>
    </div>
  );
};

export default SetupPreview;
