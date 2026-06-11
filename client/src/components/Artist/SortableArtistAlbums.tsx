import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import useSortableReorder from "utils/useSortableReorder";

import SortableTrackGroupItem from "./SortableTrackGroupItem";

const SortableArtistAlbums: React.FC = () => {
  const { artistId } = useParams();

  const { data: artist, refetch } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const {
    items: trackGroups,
    sensors,
    onDragEnd,
  } = useSortableReorder(artist?.trackGroups, async (trackGroupIds) => {
    await api.put(`manage/artists/${artistId}/trackGroupOrder`, {
      trackGroupIds,
    });
    await refetch();
  });

  return (
    <TrackgroupGrid
      gridNumber={"3"}
      wrap
      as="ul"
      role="list"
      aria-labelledby="artist-navlink-releases"
    >
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {trackGroups && artist && (
          <SortableContext items={trackGroups}>
            {trackGroups.map((trackGroup) => (
              <SortableTrackGroupItem
                key={trackGroup.id}
                id={trackGroup.id}
                trackGroup={{ ...trackGroup, artist }}
              />
            ))}
          </SortableContext>
        )}
      </DndContext>
    </TrackgroupGrid>
  );
};

export default SortableArtistAlbums;
