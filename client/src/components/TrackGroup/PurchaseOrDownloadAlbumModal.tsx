import Modal from "components/common/Modal";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";
import { useArtistContext } from "state/ArtistContext";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import AddToCollection from "./AddToCollection";
import { useAuthContext } from "state/AuthContext";
import { ArtistButton } from "components/Artist/ArtistButtons";
import useArtistQuery from "utils/useArtistQuery";
import { useQuery } from "@tanstack/react-query";
import { queryUserStripeStatus } from "queries";
import BackingThisProject from "./BackingThisProject";

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
}> = ({ trackGroup, track }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const { user } = useAuthContext();
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const [isOwned, setIsOwned] = React.useState(false);
  const { data: artist } = useArtistQuery();
  const { data: userStripeStatus } = useQuery(
    queryUserStripeStatus(artist?.userId)
  );

  const userId = user?.id;
  const trackGroupPurchases = user?.userTrackGroupPurchases;
  const trackPurchases = user?.userTrackPurchases;

  const checkForAlbumOwnership = React.useCallback(async () => {
    try {
      if (userId) {
        const purchased = track
          ? trackPurchases?.find((p) => p.trackId === track.id)
          : trackGroupPurchases?.find((p) => p.trackGroupId === trackGroup.id);

        setIsOwned(!!purchased);
      }
    } catch (e) {
      console.error(e);
    }
  }, [trackPurchases, trackGroupPurchases, trackGroup.id, userId]);

  React.useEffect(() => {
    checkForAlbumOwnership();
  }, [checkForAlbumOwnership]);

  if (!trackGroup || !artist) {
    return null;
  }

  if (!trackGroup.isGettable) {
    return null;
  }

  const hasPledge = user?.pledges?.find(
    (p) => p.trackGroupId === trackGroup.id
  );

  if (trackGroup.isAllOrNothing && hasPledge) {
    return (
      <BackingThisProject
        amount={hasPledge.amount}
        currency={trackGroup?.currency}
      />
    );
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

  const payOrNameYourPrice =
    trackGroup.minPrice === 0 && !trackGroup.isPriceFixed
      ? "nameYourPriceLabel"
      : "buy";

  const preOrderOrBuyText = trackGroup.isAllOrNothing
    ? "backThisProject"
    : isBeforeReleaseDate
      ? "preOrder"
      : payOrNameYourPrice;
  const purchaseTitle = isBeforeReleaseDate
    ? "preOrderingTrackGroup"
    : "buyingTrackGroup";

  const showPurchase = !isOwned && userStripeStatus?.chargesEnabled;

  const showDownload = isOwned && !isBeforeReleaseDate;

  const addToCollection =
    !isOwned &&
    userId &&
    !userStripeStatus?.chargesEnabled &&
    (trackGroup.minPrice === 0 || trackGroup.minPrice === null);

  return (
    <>
      <div
        className={css`
          z-index: 2;
        `}
      >
        {showPurchase && (
          <div
            className={css`
              margin-top: 0rem;
              z-index: 2;
            `}
          >
            <ArtistButton
              variant="outlined"
              onClick={() => setIsPurchasingAlbum(true)}
            >
              {t(preOrderOrBuyText)}
            </ArtistButton>
          </div>
        )}
        {addToCollection && <AddToCollection trackGroup={trackGroup} />}
        {showDownload && (
          <DownloadAlbumButton trackGroup={trackGroup} onlyIcon track={track} />
        )}
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

export default PurchaseOrDownloadAlbum;
