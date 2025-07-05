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

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
}> = ({ trackGroup, track }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const { user } = useAuthContext();
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const [isOwned, setIsOwned] = React.useState(false);
  const { state: artistState } = useArtistContext();

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

  if (!trackGroup || !artistState?.artist) {
    return null;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

  const payOrNameYourPrice =
    trackGroup.minPrice === 0 && !trackGroup.isPriceFixed
      ? "nameYourPriceLabel"
      : "buy";

  const preOrderOrBuyText = isBeforeReleaseDate
    ? "preOrder"
    : payOrNameYourPrice;
  const purchaseTitle = isBeforeReleaseDate
    ? "preOrderingTrackGroup"
    : "buyingTrackGroup";

  if ((isBeforeReleaseDate && !userId) || !trackGroup.isGettable) {
    return null;
  }

  const showPurchase =
    !isOwned && artistState?.userStripeStatus?.chargesEnabled;

  const showDownload = isOwned && !isBeforeReleaseDate;
  console.log("showPruchase", showPurchase);

  const addToCollection =
    !isOwned &&
    userId &&
    !artistState?.userStripeStatus?.chargesEnabled &&
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
