import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { queryArtist, queryUserStripeStatus } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDonate } from "react-icons/fa";

import TipArtistModal from "./TipArtistModal";

export const tipButtonStyle = css`
  && {
    background-color: var(--mi-button-tint-color) !important;
    color: var(--mi-text-color) !important;
    border-color: color-mix(
      in srgb,
      var(--mi-button-color) 20%,
      transparent
    ) !important;

    svg {
      fill: var(--mi-text-color) !important;
    }

    &:hover:not(:disabled) {
      background-color: var(--mi-button-color) !important;
      color: var(--mi-button-text-color) !important;

      svg {
        fill: var(--mi-button-text-color) !important;
      }
    }
  }
`;

const TipArtist: React.FC<{
  artistId: number;
  label?: string;
}> = ({ artistId, label }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: `${artistId}`, includeDefaultTier: true })
  );
  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const [isTipPopUpOpen, setIsTipPopUpOpen] = React.useState(false);

  const onTipClick = React.useCallback(() => {
    setIsTipPopUpOpen(true);
  }, []);

  if (!artist || !stripeAccountStatus?.chargesEnabled) {
    return null;
  }

  return (
    <>
      <TipArtistModal
        artist={artist}
        open={isTipPopUpOpen}
        onClose={() => setIsTipPopUpOpen(false)}
      />
      <ArtistButton
        className={`tip-artist ${tipButtonStyle}`}
        type="button"
        onClick={onTipClick}
        startIcon={<FaDonate />}
      >
        {label ?? t("tipArtist")}
      </ArtistButton>
    </>
  );
};

export default TipArtist;
