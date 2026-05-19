import {
  BulkTrackUploadRow,
  PercentUpload,
} from "components/ManageArtist/ManageTrackGroup/BulkTrackUploadRow";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { ImageQueueItem, useUpload } from "state/UploadContext";

const ImageUploadRow: React.FC<{ item: ImageQueueItem }> = ({ item }) => {
  const { t } = useTranslation("translation", { keyPrefix: "uploadPanel" });
  const percent =
    item.status === "completed" ? 100 : item.status === "failed" ? 0 : 50;
  return (
    <div className="relative mb-[0.2rem] flex items-center gap-3 bg-[var(--mi-tint-color)]">
      <PercentUpload percentUpload={percent} />
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt={item.name}
          className="relative z-[1] h-10 w-10 flex-shrink-0 rounded object-cover"
        />
      )}
      <div className="relative z-[1] flex-1 px-4 py-2 text-sm">
        {t("processingImage", { name: item.name })}
      </div>
    </div>
  );
};

const UploadProgressPanel: React.FC = () => {
  const { queue, imageQueue, isActive } = useUpload();
  const { t } = useTranslation("translation", { keyPrefix: "uploadPanel" });
  const [collapsed, setCollapsed] = React.useState(false);

  if (!isActive) return null;

  const activeCount = queue.length + imageQueue.length;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-[90px] z-[999] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--mi-border-radius)] border border-[var(--mi-darken-background-color)] bg-[var(--mi-background-color)] text-[var(--mi-text-color)] shadow-[0_4px_16px_rgba(0,0,0,0.25)] max-sm:right-2 max-sm:bottom-[110px] max-sm:left-2 max-sm:w-auto"
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
          {imageQueue.map((item) => (
            <ImageUploadRow key={item.id} item={item} />
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
