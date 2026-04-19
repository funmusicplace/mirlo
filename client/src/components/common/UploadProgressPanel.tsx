import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useUpload } from "state/UploadContext";
import { BulkTrackUploadRow } from "components/ManageArtist/ManageTrackGroup/BulkTrackUploadRow";
import { bp } from "../../constants";

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
      className={css`
        position: fixed;
        right: 1rem;
        bottom: 90px;
        z-index: 999;
        width: 360px;
        max-width: calc(100vw - 2rem);
        background: var(--mi-normal-background-color);
        color: var(--mi-normal-foreground-color);
        border: 1px solid var(--mi-darken-background-color);
        border-radius: var(--mi-border-radius);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        overflow: hidden;

        @media (max-width: ${bp.small}px) {
          right: 0.5rem;
          left: 0.5rem;
          width: auto;
          bottom: 110px;
        }
      `}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: var(--mi-darken-background-color);
          color: inherit;
          font-weight: 600;
          font-size: 0.9rem;
          border: none;
          width: 100%;
          cursor: pointer;
        `}
      >
        <span>{t("uploadsInProgress", { count: activeCount })}</span>
        {collapsed ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {!collapsed && (
        <div
          className={css`
            max-height: 280px;
            overflow-y: auto;
            padding: 0.5rem;
          `}
        >
          {queue.map((item) => (
            <BulkTrackUploadRow
              key={`${item.trackGroupId}-${item.title}`}
              track={item}
            />
          ))}
          <p
            className={css`
              font-size: 0.75rem;
              color: var(--mi-lighter-foreground-color);
              margin: 0.5rem 0 0 0;
            `}
          >
            {t("keepBrowserOpen")}
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadProgressPanel;
