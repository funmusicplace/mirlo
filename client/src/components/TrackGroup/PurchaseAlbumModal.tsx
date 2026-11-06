import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { FixedButton } from "components/common/FixedButton";
import Modal from "components/common/Modal";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { bp } from "../../constants";

const LABELS_BY_TARGET: Record<
  "track" | "album",
  Partial<Record<string, string>>
> = {
  track: {
    buy: "buyTrack",
    preOrder: "preOrderTrack",
    addToCollection: "addTrackToCollection",
  },
  album: { buy: "buyAlbum", preOrder: "preOrderAlbum" },
};

const PurchaseAlbumModal: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  fixed?: boolean;
  compact?: boolean;
  labelTarget?: "track" | "album";
}> = ({ trackGroup, track, fixed, compact, labelTarget }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: trackGroup.artist.urlSlug })
  );
  const wantsToBuy = searchParams.get("buy") === "true";

  React.useEffect(() => {
    if (wantsToBuy && artist) {
      setIsPurchasingAlbum(true);
    }
  }, [wantsToBuy, artist]);

  const closeModal = () => {
    setIsPurchasingAlbum(false);
    if (searchParams.get("buy")) {
      const next = new URLSearchParams(searchParams);
      next.delete("buy");
      setSearchParams(next, { replace: true });
    }
  };

  if (!trackGroup || !artist) {
    return null;
  }

  if (!trackGroup.isGettable) {
    return null;
  }

  const minPrice = track?.minPrice ?? trackGroup.minPrice;
  const payOrNameYourPrice = minPrice === 0 ? "nameYourPriceLabel" : "buy";

  const preOrderOrBuyText =
    minPrice === null
      ? "addToCollection"
      : trackGroup.fundraiser?.isAllOrNothing
        ? "backThisProject"
        : trackGroup.isPreorder
          ? "preOrder"
          : payOrNameYourPrice;
  const buttonLabel =
    (labelTarget && LABELS_BY_TARGET[labelTarget][preOrderOrBuyText]) ??
    preOrderOrBuyText;
  const isAddToCollection = preOrderOrBuyText === "addToCollection";
  const isNameYourPrice = preOrderOrBuyText === "nameYourPriceLabel";
  const isLongLabel = isAddToCollection || isNameYourPrice;
  const purchaseTitle = trackGroup.isPreorder
    ? "preOrderingTrackGroup"
    : "buyingTrackGroup";

  const button = fixed ? (
    <FixedButton
      onClick={() => setIsPurchasingAlbum(true)}
      rounded
      size="compact"
    >
      {t(buttonLabel)}
    </FixedButton>
  ) : (
    <ArtistButton
      type="button"
      onClick={() => setIsPurchasingAlbum(true)}
      variant="outlined"
      className={css`
        ${isLongLabel && compact
          ? "font-size: 0.65rem !important; padding-left: 0.5rem !important; padding-right: 0.5rem !important;"
          : isLongLabel
            ? "font-size: 0.875rem !important; padding-left: 1rem !important; padding-right: 1rem !important;"
            : compact
              ? "padding-left: 0.5rem !important; padding-right: 0.5rem !important;"
              : "padding-left: 2rem !important; padding-right: 2rem !important;"}

        ${compact
          ? `
          .children {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
          }
        `
          : `
          @media screen and (max-width: ${bp.medium}px) {
            width: 100%;

            .children {
              white-space: normal;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              line-height: 1.1;
            }
          }
        `}
      `}
    >
      {t(buttonLabel)}
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
        onClose={closeModal}
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
