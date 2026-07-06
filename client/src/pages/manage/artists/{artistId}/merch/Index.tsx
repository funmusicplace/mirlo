import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import SectionActionStrip from "components/common/SectionActionStrip";
import { queryManagedArtist, queryManagedArtistMerch } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTags } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import useSortableReorder from "utils/useSortableReorder";

import ManageSectionWrapper from "components/ManageArtist/ManageSectionWrapper";

import DashedList from "components/ManageArtist/Merch/DashedList";
import MerchFulfillmentLink from "components/ManageArtist/Merch/MerchFulfillmentLink";
import { NewMerchButton } from "components/ManageArtist/Merch/NewMerchButton";
import SortableMerchItem from "components/ManageArtist/Merch/SortableMerchItem";

const Index: React.FC<{}> = () => {
  const { artistId } = useParams();
  const { t: tArtist } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const {
    data: merch,
    isLoading,
    refetch,
  } = useQuery(queryManagedArtistMerch({ artistId: Number(artistId) }));

  const {
    items: merchList,
    sensors,
    onDragEnd,
  } = useSortableReorder(merch?.results, async (merchIds) => {
    await api.put(`manage/artists/${artistId}/merchOrder`, { merchIds });
    await refetch();
  });

  if (isLoading || isLoadingArtist) {
    return <LoadingBlocks />;
  }

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <SectionActionStrip>
        <ArtistButtonLink
          to={`/manage/artists/${artistId}/pricing`}
          size="compact"
          startIcon={<FaTags />}
          variant="dashed"
          collapsible
        >
          {tArtist("bulkPricing")}
        </ArtistButtonLink>
        <NewMerchButton artist={artist} />
      </SectionActionStrip>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <DashedList>
          {merchList && (
            <SortableContext items={merchList}>
              {merchList.map((item) => (
                <SortableMerchItem key={item.id} artist={artist} item={item} />
              ))}
            </SortableContext>
          )}
        </DashedList>
      </DndContext>

      <MerchFulfillmentLink />
    </ManageSectionWrapper>
  );
};

export default Index;
