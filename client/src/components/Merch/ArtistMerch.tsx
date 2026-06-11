import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { NewMerchButton } from "components/ManageArtist/Merch/NewMerchButton";
import { queryArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import useSortableReorder from "utils/useSortableReorder";

import SortableArtistMerchItem from "./SortableArtistMerchItem";

const ArtistMerch: React.FC = () => {
  const { user } = useAuthContext();
  const { artistId } = useParams();
  const { data: artist, refetch } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const {
    items: merch,
    sensors,
    onDragEnd,
  } = useSortableReorder(artist?.merch, async (merchIds) => {
    await api.put(`manage/artists/${artist?.id}/merchOrder`, { merchIds });
    await refetch();
  });

  if (!artist || (artist.merch?.length === 0 && artist.userId !== user?.id)) {
    return null;
  }

  return (
    <div className="mt-0 mb-8 max-md:mb-0 max-md:rounded-none">
      <SpaceBetweenDiv>
        <div />
        {artist.userId === user?.id && <NewMerchButton artist={artist} />}
      </SpaceBetweenDiv>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <TrackgroupGrid
          gridNumber={"3"}
          wrap
          as="ul"
          role="list"
          aria-labelledby="artist-navlink-releases"
        >
          {merch && (
            <SortableContext items={merch}>
              {merch.map((m) => (
                <SortableArtistMerchItem
                  key={m.id}
                  id={m.id}
                  merch={{ ...m, artist }}
                />
              ))}
            </SortableContext>
          )}
        </TrackgroupGrid>
      </DndContext>
    </div>
  );
};

export default ArtistMerch;
