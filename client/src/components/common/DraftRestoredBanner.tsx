import React from "react";
import { useTranslation } from "react-i18next";

interface DraftRestoredBannerProps {
  onDiscard: () => void;
  onKeep: () => void;
  fieldLabels?: string[];
}

const DraftRestoredBanner: React.FC<DraftRestoredBannerProps> = ({
  onDiscard,
  onKeep,
  fieldLabels,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "common" });

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded border border-(--mi-tint-x-color) bg-(--mi-tint-color) px-4 py-4 text-sm"
    >
      <div className="flex flex-col gap-1">
        <span>{t("draftRestored")}</span>
        {fieldLabels && fieldLabels.length > 0 && (
          <span className="text-(--mi-neutral-500)">
            {t("fieldsRestored", {
              count: fieldLabels.length,
              fields: fieldLabels.join(", "),
            })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
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
