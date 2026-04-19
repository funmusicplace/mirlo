import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useUpload } from "state/UploadContext";
import { BulkTrackUploadRow } from "components/ManageArtist/ManageTrackGroup/BulkTrackUploadRow";

const UploadProgressPanel: React.FC = () => {
  const { queue, isActive } = useUpload();
  const { t } = useTranslation("translation", { keyPrefix: "uploadPanel" });
  const [collapsed, setCollapsed] = React.useState(false);

  if (!isActive) return null;

  const activeCount = queue.length;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-[90px] z-[999] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--mi-border-radius)] border border-[var(--mi-darken-background-color)] bg-[var(--mi-normal-background-color)] text-[var(--mi-normal-foreground-color)] shadow-[0_4px_16px_rgba(0,0,0,0.25)] max-sm:right-2 max-sm:bottom-[110px] max-sm:left-2 max-sm:w-auto"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="flex w-full cursor-pointer items-center justify-between border-none bg-[var(--mi-darken-background-color)] px-3 py-2 text-[0.9rem] font-semibold text-inherit"
      >
        <span>{t("uploadsInProgress", { count: activeCount })}</span>
        {collapsed ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {!collapsed && (
        <div className="max-h-[280px] overflow-y-auto p-2">
          {queue.map((item) => (
            <BulkTrackUploadRow
              key={`${item.trackGroupId}-${item.title}`}
              track={item}
            />
          ))}
          <p className="mt-2 text-xs text-[var(--mi-lighter-foreground-color)]">
            {t("keepBrowserOpen")}
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadProgressPanel;
