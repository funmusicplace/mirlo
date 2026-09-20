import ReleaseCard from "components/common/ReleaseCard";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import React from "react";
import { useTranslation } from "react-i18next";

import { ArtistButton } from "./ArtistButtons";

const SubscriptionTierReleases: React.FC<{
  tier: ArtistSubscriptionTier;
  maxItems?: number;
}> = ({ tier, maxItems }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [showAll, setShowAll] = React.useState(false);

  const releases = tier.releases ?? [];
  const canTruncate = !!maxItems && releases.length > maxItems;
  const isTruncated = canTruncate && !showAll;
  const visibleReleases = isTruncated ? releases.slice(0, maxItems) : releases;

  if (visibleReleases.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <TrackgroupGrid gridNumber="4" wrap as="ul" role="list">
        {visibleReleases.map((release) => (
          <ReleaseCard
            key={release.trackGroup.id}
            trackGroup={release.trackGroup}
            showArtist
            headingLevel="h4"
          />
        ))}
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
