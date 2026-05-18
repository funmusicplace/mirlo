import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { produce } from "immer";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { TabId } from "utils/artistTabs";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import type { ArtistFormData } from "./CustomizeLook";
import SortableTabItem from "./SortableTabItem";

export const determineNewTabOrder = produce(
  (oldTabs: TabId[], droppedInId: TabId, draggingTabId: TabId) => {
    const dragIdx = oldTabs.indexOf(draggingTabId);
    const dropIdx = oldTabs.indexOf(droppedInId);
    const draggedItem = oldTabs.splice(dragIdx, 1);
    oldTabs.splice(dropIdx, 0, draggedItem[0]);
    return oldTabs;
  }
);

const AVAILABLE_TABS: TabId[] = [
  "roster",
  "releases",
  "posts",
  "support",
  "merch",
];

export const SortableTabsOrder: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "artistForm",
  });
  const { data: artist } = useManagedArtistQuery();
  const methods = useFormContext<ArtistFormData>();

  const currentOrder = artist?.properties?.tabOrder || AVAILABLE_TABS;
  const [tabOrder, setTabOrder] = useState<TabId[]>(currentOrder);

  React.useEffect(() => {
    setTabOrder(artist?.properties?.tabOrder || AVAILABLE_TABS);
  }, [artist?.properties?.tabOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id && over) {
      const newOrder = determineNewTabOrder(
        tabOrder,
        over.id as TabId,
        active.id as TabId
      );

      setTabOrder(newOrder);
      methods.setValue("properties.tabOrder", newOrder);
    }
  }

  if (!artist) {
    return null;
  }

  const visibleTabs = tabOrder.filter(
    (tabId) =>
      (tabId !== "roster" || artist.isLabelProfile) && tabId !== undefined
  );

  return (
    <div className="w-full">
      <h2>{t("customTabTitles")}</h2>
      <p>{t("customTabTitlesDescription")}</p>
      <ul className="flex flex-col md:flex-row gap-0.5 md:gap-2 list-none p-0 m-0">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleTabs}>
            {visibleTabs.map((tabId) => (
              <SortableTabItem key={tabId} tabId={tabId} />
            ))}
          </SortableContext>
        </DndContext>
      </ul>
    </div>
  );
};

export default SortableTabsOrder;
