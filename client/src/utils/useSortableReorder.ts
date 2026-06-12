import {
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import React from "react";

/**
 * Shared drag-and-drop reordering for a list of items keyed by `id`.
 *
 * Keeps a local copy of `items` (so the grid updates optimistically while the
 * request is in flight), exposes dnd-kit `sensors` + an `onDragEnd` handler,
 * and calls `persistOrder` with the reordered ids whenever the user drops an
 * item in a new position.
 */
function useSortableReorder<T extends { id: string | number }>(
  items: T[] | undefined,
  persistOrder: (orderedIds: T["id"][]) => Promise<void>
) {
  const [orderedItems, setOrderedItems] = React.useState(items);

  React.useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!orderedItems || !over || active.id === over.id) {
      return;
    }
    const oldIndex = orderedItems.findIndex((i) => i.id === active.id);
    const newIndex = orderedItems.findIndex((i) => i.id === over.id);
    const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(newOrder);
    await persistOrder(newOrder.map((i) => i.id));
  }

  return { items: orderedItems, sensors, onDragEnd };
}

export default useSortableReorder;
