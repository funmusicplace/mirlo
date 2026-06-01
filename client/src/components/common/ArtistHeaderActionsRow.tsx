import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import ArtistHeaderActionsStrip from "components/Artist/ArtistHeaderActionsStrip";
import ArtistFormLabel from "components/ManageArtist/ArtistFormLabel";
import { UpdateArtistBody } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { getArtistUrl } from "utils/artist";

import { bp } from "../../constants";

const ArtistHeaderActionsRow: React.FC<{
  artist: Artist;
  isManage: boolean;
  onSubmit: (data: UpdateArtistBody) => Promise<void>;
}> = ({ artist, isManage, onSubmit }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const displayedLabelArtist = React.useMemo(() => {
    if (artist.isLabelProfile) return null;
    const match = (artist.artistLabels ?? []).find(
      (al) =>
        al.isDisplayedOnArtistPage && al.isArtistApproved && al.isLabelApproved
    );
    return match?.labelUser.artists?.[0] ?? null;
  }, [artist]);

  return (
    <div
      className={`w-full flex flex-row items-baseline justify-end pb-2 md:justify-between max-md:py-1 max-md:border-t max-md:border-(--mi-button-color)/50 ${displayedLabelArtist ? "md:mt-2" : "md:mt-1"}`}
    >
      <div className="flex flex-row items-baseline gap-2">
        {displayedLabelArtist && (
          <ArtistButtonLink
            variant="chip"
            to={getArtistUrl(displayedLabelArtist)}
            className={css`
              &[class] {
                background-color: color-mix(
                  in srgb,
                  var(--mi-button-color) 8%,
                  transparent
                ) !important;
                filter: brightness(var(--mi-chip-brightness, 1));
              }
              @media screen and (max-width: ${bp.medium}px) {
                &[class] {
                  display: none !important;
                }
              }
            `}
          >
            {t("onLabel", { name: displayedLabelArtist.name })}
          </ArtistButtonLink>
        )}
        {isManage && <ArtistFormLabel artist={artist} />}
      </div>
      <ArtistHeaderActionsStrip
        artist={artist}
        isManage={isManage}
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default ArtistHeaderActionsRow;
