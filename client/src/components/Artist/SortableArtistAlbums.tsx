import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { useParams } from "react-router-dom";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";

import api from "services/api";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import SortableTrackGroupItem from "./SortableTrackGroupItem";
import { produce } from "immer";
import LoadingSpinner from "components/common/LoadingSpinner";
import { css } from "@emotion/css";
import Background from "components/common/Background";

export const determineNewTrackGroupOrder = produce(
  (
    oldTrackGroups: TrackGroup[],
    droppedInId: number,
    draggingTrackId: number
  ) => {
    const dragIdx = oldTrackGroups.findIndex(
      (track) => track.id === draggingTrackId
    );
    const dropIdx = oldTrackGroups.findIndex(
      (track) => track.id === droppedInId
    );
    const draggedItem = oldTrackGroups.splice(dragIdx, 1);
    oldTrackGroups.splice(dropIdx, 0, draggedItem[0]);
    return oldTrackGroups;
  }
);

const SortableArtistAlbums: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { artistId } = useParams();

  const { data: artist, refetch } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const [trackGroups, setTrackGroups] = React.useState(() =>
    artist?.trackGroups?.map((trackGroup) => ({ ...trackGroup, artist }))
  );

  React.useEffect(() => {
    setTrackGroups(
      artist?.trackGroups?.map((trackGroup) => ({ ...trackGroup, artist }))
    );
  }, [artist?.trackGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (trackGroups && active.id !== over?.id && over) {
      const newOrder = determineNewTrackGroupOrder(
        trackGroups,
        over.id as number,
        active.id as number
      );

      setTrackGroups(newOrder);

      setIsLoading(true);

      await api.put(`manage/artists/${artistId}/trackGroupOrder`, {
        trackGroupIds: newOrder.map((t) => t.id),
      });
      await refetch();
      setIsLoading(false);
    }
  }

  return (
    <TrackgroupGrid
      gridNumber={"3"}
      wrap
      as="ul"
      role="list"
      aria-labelledby="artist-navlink-releases"
    >
      {isLoading && (
        <Background
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <LoadingSpinner
            size="large"
            fill={artist?.properties?.colors?.foreground}
          />
        </Background>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {trackGroups && (
          <SortableContext items={trackGroups}>
            {trackGroups?.map((trackGroup) => (
              <SortableTrackGroupItem
                key={trackGroup.id}
                id={trackGroup.id}
                trackGroup={trackGroup}
              />
            ))}
          </SortableContext>
        )}
      </DndContext>
    </TrackgroupGrid>
  );
};

export default SortableArtistAlbums;
