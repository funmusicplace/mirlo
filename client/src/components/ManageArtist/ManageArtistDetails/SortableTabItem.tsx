import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import type { ArtistFormData } from "pages/manage/artists/{artistId}/customize/Index";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AiOutlineDrag } from "react-icons/ai";
import { TabId } from "utils/artistTabs";

const TAB_NAME_KEYS: Record<TabId, string> = {
  roster: "roster",
  releases: "releases",
  posts: "updates",
  support: "support",
  merch: "merch",
};

const SortableTabItem: React.FC<{ tabId: TabId }> = ({ tabId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { t: tArtist } = useTranslation("translation", {
    keyPrefix: "artist",
  });
  const methods = useFormContext<ArtistFormData>();

  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tabId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tabName = tArtist(TAB_NAME_KEYS[tabId]);
  const tabLabel = t("tabNameLabel", { tabName });
  const inputId = `input-${tabId}-tab`;

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={css`
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: var(--mi-background-color-secondary);
        border: 1px solid var(--mi-border-color);
        border-radius: 4px;
      `}
    >
      <ArtistButton
        {...listeners}
        ref={setActivatorNodeRef}
        startIcon={<AiOutlineDrag />}
        className={css`
          cursor: grab;
          flex-shrink: 0;
          &:active {
            cursor: grabbing;
          }
        `}
        aria-label={t("reorderTab", { tab: tabLabel })}
      />
      <FormComponent className="flex-1 max-md:m-0!">
        <label htmlFor={inputId}>{tabLabel}</label>
        <InputEl
          id={inputId}
          type="text"
          placeholder={tabName ?? ""}
          {...methods.register(`properties.titles.${tabId}` as const)}
        />
      </FormComponent>
    </li>
  );
};

export default SortableTabItem;
