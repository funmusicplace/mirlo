import Modal from "components/common/Modal";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";

import { ArtistButton } from "components/Artist/ArtistButtons";
import useArtistQuery from "utils/useArtistQuery";
import { FixedButton } from "components/common/FixedButton";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import CurrencyCoinIcon from "components/common/CurrencyCoinIcon";
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

  const isPublished =
    trackGroup.published ||
    (trackGroup.publishedAt && new Date(trackGroup.publishedAt) <= new Date());

  if (!isPublished) {
    return null;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

  const payOrNameYourPrice =
    trackGroup.minPrice === 0 && !trackGroup.isPriceFixed
      ? "nameYourPriceLabel"
      : "buy";

  const preOrderOrBuyText = trackGroup.fundraiser?.isAllOrNothing
    ? "backThisProject"
    : isBeforeReleaseDate
      ? "preOrder"
      : payOrNameYourPrice;
  const purchaseTitle = isBeforeReleaseDate
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
