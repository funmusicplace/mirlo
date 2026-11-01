import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getReleaseUrl } from "utils/artist";

const ReleaseLinkCard: React.FC<{
  trackGroup: TrackGroup;
  subtitle?: React.ReactNode;
}> = ({ trackGroup, subtitle }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <Link
      to={getReleaseUrl(trackGroup.artist, trackGroup)}
      className="block no-underline! text-(--mi-text-color)! hover:opacity-80 transition-opacity"
    >
      <ImageWithPlaceholder
        src={trackGroup.cover?.sizes?.[300]}
        alt={trackGroup.coverImageAlt ?? ""}
        size={300}
        className="rounded-(--mi-border-radius) overflow-hidden"
      />
      <p className="mt-2 text-sm font-semibold truncate">
        {trackGroup.title || <i className="opacity-80">{t("untitled")}</i>}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-(--mi-light-foreground-color) truncate">
          {subtitle}
        </p>
      )}
    </Link>
  );
};

export default ReleaseLinkCard;
