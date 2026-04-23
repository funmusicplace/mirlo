import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import CurrencyCoinIcon from "components/common/CurrencyCoinIcon";
import { FixedButton } from "components/common/FixedButton";
import Modal from "components/common/Modal";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";

import { bp } from "../../constants";

const PurchaseAlbumModal: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  fixed?: boolean;
  collapse?: boolean;
}> = ({ trackGroup, track, fixed, collapse }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: trackGroup.artist.urlSlug })
  );

  if (!trackGroup || !artist) {
    return null;
  }

  if (!trackGroup.isGettable) {
    return null;
  }

  const payOrNameYourPrice =
    trackGroup.minPrice === 0 ? "nameYourPriceLabel" : "buy";

  const preOrderOrBuyText =
    trackGroup.minPrice === null
      ? "saveAlbum"
      : trackGroup.fundraiser?.isAllOrNothing
        ? "backThisProject"
        : trackGroup.isPreorder
          ? "preOrder"
          : payOrNameYourPrice;
  const purchaseTitle = trackGroup.isPreorder
    ? "preOrderingTrackGroup"
    : "buyingTrackGroup";

  const button = fixed ? (
    <FixedButton
      onClick={() => setIsPurchasingAlbum(true)}
      rounded
      size="compact"
    >
      {t(preOrderOrBuyText)}
    </FixedButton>
  ) : (
    <ArtistButton
      type="button"
      onClick={() => setIsPurchasingAlbum(true)}
      variant="outlined"
      startIcon={
        collapse ? (
          <CurrencyCoinIcon currency={trackGroup.currency} />
        ) : undefined
      }
      className={css`
        font-size: 1rem !important;
        padding-left: 2rem !important;
        padding-right: 2rem !important;

        .children {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media screen and (max-width: ${bp.medium}px) {
          width: 100%;
        }
      `}
    >
      {collapse ? "" : t(preOrderOrBuyText)}
    </ArtistButton>
  );

  return (
    <>
      <div
        className={css`
          margin-top: 0rem;
          z-index: 2;
        `}
      >
        {button}
      </div>

      <Modal
        size="small"
        open={isPurchasingAlbum}
        onClose={() => setIsPurchasingAlbum(false)}
        title={
          t(purchaseTitle, { title: track?.title ?? trackGroup.title }) ?? ""
        }
        noPadding
      >
        <BuyTrackGroup trackGroup={trackGroup} track={track} />
      </Modal>
    </>
  );
};

export default PurchaseAlbumModal;
