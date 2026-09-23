import Pill from "components/common/Pill";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistTiersUrl } from "utils/artist";

const SubscriberExclusivePill: React.FC<{
  artist: Artist;
  trackGroup: TrackGroup;
  className?: string;
}> = ({ artist, trackGroup, className }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <Link
      to={getArtistTiersUrl(trackGroup.subscriptionArtist ?? artist)}
      className={`flex h-full no-underline! hover:no-underline! shrink-0 ${className ?? ""}`}
    >
      <Pill variant="tint" isHoverable className="h-full">
        {t("subscriberExclusive")}
      </Pill>
    </Link>
  );
};

export default SubscriberExclusivePill;
