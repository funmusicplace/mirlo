import { useQuery } from "@tanstack/react-query";
import ArtistRouterLink from "components/Artist/ArtistButtons";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { queryPublicRecommendedTrackGroups } from "queries/trackGroups";
import React from "react";
import { useTranslation } from "react-i18next";
import { getReleaseUrl } from "utils/artist";

const RecommendedAlbums: React.FC<{
  trackGroupId: number;
  artist: Artist;
  centered?: boolean;
}> = ({ trackGroupId, artist, centered }) => {
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
    <div className={`mt-12 ${centered ? "text-center" : ""}`}>
      <h2>{t("artistRecommends", { artistName: artist.name })}</h2>
      <div
        className={`flex flex-wrap gap-6 mt-4 ${centered ? "justify-center" : ""}`}
      >
        {recommendedTrackGroups.results.map((rec: TrackGroup) => (
          <ArtistRouterLink
            key={rec.id}
            to={getReleaseUrl(rec.artist, rec)}
            className="no-underline! text-inherit hover:opacity-80 transition-opacity w-[calc(50%-0.75rem)] md:w-52"
          >
            <div>
              <ImageWithPlaceholder
                src={rec.cover?.sizes?.[300]}
                alt={rec.coverImageAlt}
                size={300}
              />
              <p className="mt-2 text-sm font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                {rec.title}
              </p>
              <p className="mt-1 text-(--mi-button-color) text-xs">
                {rec.artist?.name}
              </p>
            </div>
          </ArtistRouterLink>
        ))}
      </div>
    </div>
  );
};

export default RecommendedAlbums;
