import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import ArtistTrackGroup from "./ArtistTrackGroup";
import { ArtistButton } from "./ArtistButtons";
import { FaCrosshairs } from "react-icons/fa";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";
import useArtistQuery from "utils/useArtistQuery";

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
          startIcon={<FaCrosshairs />}
        />
      )}
      <ArtistTrackGroup trackGroup={props.trackGroup} as="li" />
    </div>
  );
};

export default SortableTrackGroupItem;
