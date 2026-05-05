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
      {hasTiers && (
        <ButtonAnchor
          href={`${getArtistUrl(trackGroup.artist)}/support`}
          target="_blank"
          rel="noopener noreferrer"
          variant="pill"
        >
          {t("support")}
        </ButtonAnchor>
      )}
    </div>
  );
};

export default WidgetActionButtons;
