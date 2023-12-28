import Modal from "components/common/Modal";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { useGlobalStateContext } from "state/GlobalState";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";
import { useArtistContext } from "state/ArtistContext";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import Button from "components/common/Button";

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const {
    state: { user },
  } = useGlobalStateContext();
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const [isOwned, setIsOwned] = React.useState(false);
  const { state: artistState } = useArtistContext();

  const userId = user?.id;
  const purchases = user?.userTrackGroupPurchases;

  const checkForAlbumOwnership = React.useCallback(async () => {
    try {
      if (userId) {
        const purchased = purchases?.find(
          (p) => p.trackGroupId === trackGroup.id
        );
        setIsOwned(!!purchased);
      }
    } catch (e) {
      console.error(e);
    }
  }, [purchases, trackGroup.id, userId]);

  React.useEffect(() => {
    checkForAlbumOwnership();
  }, [checkForAlbumOwnership]);

  if (!trackGroup || !artistState?.artist) {
    return null;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

  const purchaseText = isBeforeReleaseDate ? "preOrder" : "buy";
  const purchaseTitle = isBeforeReleaseDate
    ? "preOrderingTrackGroup"
    : "buyingTrackGroup";

  if (isBeforeReleaseDate && !userId) {
    return null;
  }

  const showPurchase =
    !isOwned && artistState?.userStripeStatus?.chargesEnabled;

  const showDownload = isOwned && !isBeforeReleaseDate;

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
            <Button
              variant="outlined"
              compact
              onClick={() => setIsPurchasingAlbum(true)}
            >
              {t(purchaseText)}
            </Button>
          </div>
        )}
        {showDownload && (
          <DownloadAlbumButton trackGroup={trackGroup} onlyIcon />
        )}
      </div>

      <Modal
        size="small"
        open={isPurchasingAlbum}
        onClose={() => setIsPurchasingAlbum(false)}
        title={t(purchaseTitle, { title: trackGroup.title }) ?? ""}
      >
        <BuyTrackGroup trackGroup={trackGroup} />
      </Modal>
    </>
  );
};

export default PurchaseOrDownloadAlbum;
