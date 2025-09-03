import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import ArtistTrackGroup from "./ArtistTrackGroup";
import { ArtistButton } from "./ArtistButtons";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";
import useArtistQuery from "utils/useArtistQuery";
import { AiOutlineDrag } from "react-icons/ai";

const SortableTrackGroupItem: React.FC<{
  id: number;
  trackGroup: TrackGroup;
}> = (props) => {
  const { data: artist } = useArtistQuery();
  const { user } = useAuthContext();

  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={css`
        position: relative;
        button {
          opacity: 0;
        }
        &:hover button {
          opacity: 1;
        }
      `}
    >
      {user?.id === artist?.userId && (
        <ArtistButton
          className={css`
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            z-index: 999;
          `}
          {...listeners}
          ref={setActivatorNodeRef}
          startIcon={<AiOutlineDrag />}
        />
      )}
      <ArtistTrackGroup trackGroup={props.trackGroup} as="li" />
    </div>
  );
};

export default SortableTrackGroupItem;
