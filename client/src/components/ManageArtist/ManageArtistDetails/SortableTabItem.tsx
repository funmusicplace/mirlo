import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AiOutlineDrag } from "react-icons/ai";
import { TabId } from "utils/artistTabs";

import type { ArtistFormData } from "./CustomizeLook";

const TAB_LABEL_KEYS: Record<TabId, string> = {
  roster: "rosterTab",
  releases: "releasesTab",
  posts: "postsTab",
  support: "supportTab",
  merch: "merchTab",
};

const SortableTabItem: React.FC<{ tabId: TabId }> = ({ tabId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
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

  const labelKey = TAB_LABEL_KEYS[tabId];
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
        aria-label={t("reorderTab", { tab: t(labelKey) })}
      />
      <FormComponent
        className={css`
          flex: 1;
          margin: 0;
        `}
      >
        <label htmlFor={inputId}>{t(labelKey)}</label>
        <InputEl
          id={inputId}
          type="text"
          placeholder={t(labelKey) ?? ""}
          {...methods.register(`properties.titles.${tabId}` as const)}
        />
      </FormComponent>
    </li>
  );
};

export default SortableTabItem;
