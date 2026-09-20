import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import ReleaseCard from "components/common/ReleaseCard";
import SortableGridItem from "components/common/SortableGridItem";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import useSortableReorder from "utils/useSortableReorder";

import { ArtistButton } from "./ArtistButtons";

const SubscriptionTierReleases: React.FC<{
  tier: ArtistSubscriptionTier;
  artist: Artist;
  maxItems?: number;
}> = ({ tier, artist, maxItems }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const { artistId: artistSlug } = useParams();
  const queryClient = useQueryClient();
  const errorHandler = useErrorHandler();
  const [showAll, setShowAll] = React.useState(false);

  const releases = React.useMemo(
    () =>
      (tier.releases ?? []).map((release) => ({
        id: release.trackGroup.id,
        trackGroup: release.trackGroup,
      })),
    [tier.releases]
  );
  const canTruncate = !!maxItems && releases.length > maxItems;
  const isTruncated = canTruncate && !showAll;
  const visibleReleases = React.useMemo(
    () => (isTruncated ? releases.slice(0, maxItems) : releases),
    [isTruncated, releases, maxItems]
  );

  const isOwner = !!user && user.id === artist.userId;

  const { items, sensors, onDragEnd } = useSortableReorder(
    visibleReleases,
    async (visibleIds) => {
      const hiddenIds = releases
        .map((release) => release.id)
        .filter((id) => !visibleIds.includes(id));
      try {
        await api.put(
          `manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releaseOrder`,
          { trackGroupIds: [...visibleIds, ...hiddenIds] }
        );
        await Promise.all(
          [true, false].map((includeDefaultTier) =>
            queryClient.invalidateQueries({
              queryKey: queryArtist({ artistSlug, includeDefaultTier })
                .queryKey,
            })
          )
        );
      } catch (e) {
        errorHandler(e);
      }
    }
  );

  if (!items || items.length === 0) {
    return null;
  }

  const cards = items.map((release) =>
    isOwner ? (
      <SortableGridItem key={release.id} id={release.id} showHandle>
        <ReleaseCard
          trackGroup={release.trackGroup}
          showArtist
          headingLevel="h4"
        />
      </SortableGridItem>
    ) : (
      <ReleaseCard
        key={release.id}
        trackGroup={release.trackGroup}
        showArtist
        headingLevel="h4"
      />
    )
  );

  return (
    <div className="flex flex-col gap-2">
      <TrackgroupGrid gridNumber="4" wrap as="ul" role="list">
        {isOwner ? (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={items}>{cards}</SortableContext>
          </DndContext>
        ) : (
          cards
        )}
      </TrackgroupGrid>
      {canTruncate && (
        <div className="flex justify-center">
          <ArtistButton
            variant="transparent"
            color="foreground"
            size="compact"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? t("hideIncludedReleases")
              : t("seeAllIncludedReleases", { count: releases.length })}
          </ArtistButton>
        </div>
      )}
    </div>
  );
};

export default SubscriptionTierReleases;
