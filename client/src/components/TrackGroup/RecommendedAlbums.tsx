import { useQuery } from "@tanstack/react-query";
import ScrollRail from "components/common/ScrollRail";
import { queryPublicRecommendedTrackGroups } from "queries/trackGroups";
import React from "react";
import { useTranslation } from "react-i18next";

import ReleaseLinkCard from "./ReleaseLinkCard";

const RecommendedAlbums: React.FC<{
  trackGroupId: number;
  artist: Artist;
}> = ({ trackGroupId, artist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const { data: recommendedTrackGroups } = useQuery(
    queryPublicRecommendedTrackGroups(trackGroupId)
  );

  if (!recommendedTrackGroups || recommendedTrackGroups.results.length === 0) {
    return null;
  }

  return (
    <ScrollRail
      className="mt-10"
      title={t("artistRecommends", { artistName: artist.name })}
      itemWidth="calc((100% - 4rem) / 5)"
      mobileItemWidth="42%"
    >
      {recommendedTrackGroups.results.map((rec: TrackGroup) => (
        <li key={rec.id}>
          <ReleaseLinkCard
            trackGroup={rec}
            subtitle={
              <span className="text-(--mi-button-color)">
                {rec.artist?.name}
              </span>
            }
          />
        </li>
      ))}
    </ScrollRail>
  );
};

export default RecommendedAlbums;
