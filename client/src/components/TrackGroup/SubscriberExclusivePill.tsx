import Pill from "components/common/Pill";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistTiersUrl } from "utils/artist";

export const isSubscribersOnly = (trackGroup: TrackGroup) => {
  const hasPlayableTrack = trackGroup.tracks.some((track) => track.isPlayable);
  return (
    !!trackGroup.isSubscriberExclusive ||
    (!!trackGroup.isIncludedInSubscription && !hasPlayableTrack)
  );
};

const SubscriberExclusivePill: React.FC<{
  artist: Artist;
  className?: string;
}> = ({ artist, className }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <Link
      to={getArtistTiersUrl(artist)}
      className={`flex h-full no-underline! hover:no-underline! shrink-0 ${className ?? ""}`}
    >
      <Pill variant="tint" isHoverable className="h-full">
        {t("subscriberExclusive")}
      </Pill>
    </Link>
  );
};

export default SubscriberExclusivePill;
