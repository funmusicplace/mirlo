import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { AiOutlineDrag } from "react-icons/ai";

/**
 * Wraps a grid card (track group, merch item, …) so it can be dragged within a
 * dnd-kit `SortableContext`. The drag handle overlays the top-right corner and
 * is only rendered when `showHandle` is true (i.e. for the owner).
 */
const SortableGridItem: React.FC<{
  id: string | number;
  showHandle?: boolean;
  children: React.ReactNode;
}> = ({ id, showHandle, children }) => {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative [&_button]:opacity-0 hover:[&_button]:opacity-100"
    >
      {showHandle && (
        <ArtistButton
          className="absolute top-2 right-2 z-[999]"
          {...listeners}
          ref={setActivatorNodeRef}
          startIcon={<AiOutlineDrag />}
        />
      )}
      {children}
    </div>
  );
};

export default SortableGridItem;
