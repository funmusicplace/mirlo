import { css } from "@emotion/css";
import ReleaseCard from "components/common/ReleaseCard";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import React from "react";
import { useTranslation } from "react-i18next";

import { ArtistButton } from "./ArtistButtons";

const COLUMNS = 2;
const DEFAULT_MAX_ROWS = 3;

const truncatedGridClass = css`
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to bottom,
    black calc(100% - 6rem),
    transparent
  );
  mask-image: linear-gradient(to bottom, black calc(100% - 6rem), transparent);

  > ul {
    margin-bottom: -6rem;
  }
`;

const SubscriptionTierCardReleases: React.FC<{
  tier: ArtistSubscriptionTier;
  showLabel?: boolean;
  maxRows?: number;
}> = ({ tier, showLabel = true, maxRows = DEFAULT_MAX_ROWS }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [showAll, setShowAll] = React.useState(false);

  const releases = tier.releases ?? [];
  const maxItems = maxRows * COLUMNS;
  const canTruncate = releases.length > maxItems;
  const isTruncated = canTruncate && !showAll;
  const visibleReleases = isTruncated
    ? releases.slice(0, maxItems + COLUMNS)
    : releases;

  if (releases.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-col">
      {showLabel && <span>{t("includesTheseReleases")}</span>}
      <div className={isTruncated ? truncatedGridClass : undefined}>
        <TrackgroupGrid gridNumber={String(COLUMNS)} wrap as="ul" role="list">
          {visibleReleases.map((release) => (
            <ReleaseCard
              key={release.trackGroup.id}
              trackGroup={release.trackGroup}
              showArtist
              hidePurchase
              headingLevel="h4"
            />
          ))}
        </TrackgroupGrid>
      </div>
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

export default SubscriptionTierCardReleases;
