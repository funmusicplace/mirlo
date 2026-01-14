import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getReleaseUrl } from "utils/artist";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { queryPublicRecommendedTrackGroups } from "queries/trackGroups";
import ArtistRouterLink from "components/Artist/ArtistButtons";

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
    <div className="mt-12">
      <h2>{t("artistRecommends", { artistName: artist.name })}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6 mt-4">
        {recommendedTrackGroups.results.map((rec: TrackGroup) => (
          <ArtistRouterLink
            key={rec.id}
            to={getReleaseUrl(rec.artist, rec)}
            className="no-underline! text-inherit hover:opacity-80 transition-opacity"
          >
            <div>
              <ImageWithPlaceholder
                src={rec.cover?.sizes?.[300]}
                alt={rec.title ?? ""}
                size={300}
              />
              <p className="mt-2 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                {rec.title}
              </p>
              <p className="mt-1 text-gray-600 text-sm">{rec.artist?.name}</p>
            </div>
          </ArtistRouterLink>
        ))}
      </div>
    </div>
  );
};

export default RecommendedAlbums;
