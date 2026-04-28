import React from "react";
import { useTranslation } from "react-i18next";

const IncludedReleases: React.FC<{
  tier: ArtistSubscriptionTier;
}> = ({ tier }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  return (
    <>
      {tier.releases && tier.releases.length > 0 && (
        <div className="flex gap-2 flex-col ">
          <span>{t("includesTheseReleases")}</span>
          <div className="grid gap-2 grid-cols-4">
            {tier.releases.map((release) => (
              <div key={release.trackGroupId} className="flex flex-col">
                {release.trackGroup.cover && (
                  <img
                    src={
                      release.trackGroup.cover.sizes?.[120] ??
                      release.trackGroup.cover.url?.[0]
                    }
                    alt={release.trackGroup.title}
                    className="w-12 h-12 object-cover flex-shrink-0"
                  />
                )}
                {!release.trackGroup.cover && (
                  <div
                    className="w-12 h-12 flex-shrink-0"
                    style={{ backgroundColor: "var(--mi-button-color)" }}
                  />
                )}
                <span className="truncate text-sm">
                  {release.trackGroup.artist.name}
                </span>
                <span className="truncate text-sm">
                  {release.trackGroup.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default IncludedReleases;
