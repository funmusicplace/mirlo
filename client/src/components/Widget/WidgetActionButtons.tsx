import { ButtonAnchor } from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import { getArtistUrl, getReleaseUrl, getTrackUrl } from "utils/artist";

const WidgetActionButtons: React.FC<{
  artist: Artist | undefined;
  trackGroup: TrackGroup;
  track?: Track;
}> = ({ artist, trackGroup, track }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  if (!trackGroup.artist) return null;

  const buyPath = track
    ? getTrackUrl(trackGroup.artist, trackGroup, track)
    : getReleaseUrl(trackGroup.artist, trackGroup);
  const buyUrl = `${buyPath}?buy=true`;

  const hasTiers = (artist?.subscriptionTiers?.length ?? 0) > 0;
  const supportUrl = hasTiers
    ? `${getArtistUrl(trackGroup.artist)}/support`
    : getArtistUrl(trackGroup.artist);
  const supportLabel = hasTiers ? t("support") : t("follow");

  return (
    <div className="flex gap-2 ml-auto">
      <ButtonAnchor
        href={buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="pill"
      >
        {t("buy")}
      </ButtonAnchor>
      <ButtonAnchor
        href={supportUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="pill"
      >
        {supportLabel}
      </ButtonAnchor>
    </div>
  );
};

export default WidgetActionButtons;
