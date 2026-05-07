import React from "react";
import { useTranslation } from "react-i18next";

interface DraftRestoredBannerProps {
  onDiscard: () => void;
  onKeep: () => void;
}

const DraftRestoredBanner: React.FC<DraftRestoredBannerProps> = ({
  onDiscard,
  onKeep,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "common" });

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded border border-(--mi-tint-x-color) bg-(--mi-tint-color) px-4 py-4 text-sm"
    >
      <span>{t("draftRestored")}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onKeep}
          className="underline text-(--mi-link-color) hover:no-underline"
        >
          {t("keepDraft")}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="underline text-(--mi-link-color) hover:no-underline"
        >
          {t("discardDraft")}
        </button>
      </div>
    </div>
  );
};

export default DraftRestoredBanner;
