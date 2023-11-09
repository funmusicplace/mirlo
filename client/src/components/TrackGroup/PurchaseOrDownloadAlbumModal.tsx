import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import BuyTrackGroup from "components/TrackGroup/Buy";
import { useArtistContext } from "state/ArtistContext";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const {
    state: { user },
  } = useGlobalStateContext();
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const [isOwned, setIsOwned] = React.useState(false);
  const { state } = useArtistContext();

  const userId = user?.id;

  const checkForAlbumOwnership = React.useCallback(async () => {
    try {
      if (userId) {
        const { results: purchases } =
          await api.getMany<UserTrackGroupPurchase>(
            `users/${userId}/purchases?trackGroupId=${trackGroup.id}`
          );

        setIsOwned(purchases.length > 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [trackGroup.id, userId]);

  React.useEffect(() => {
    checkForAlbumOwnership();
  }, [checkForAlbumOwnership]);

  if (!trackGroup || !state?.artist) {
    return null;
  }

  const userIsTrackGroupArtist = user && state?.artist.userId === user?.id;

  return (
    <>
      <div>
        {user &&
          !userIsTrackGroupArtist &&
          !isOwned &&
          state?.userStripeStatus?.chargesEnabled && (
            <Button compact onClick={() => setIsPurchasingAlbum(true)}>
              {t("buy")}
            </Button>
          )}
        {(userIsTrackGroupArtist || isOwned) && (
          <DownloadAlbumButton trackGroup={trackGroup} />
        )}
      </div>
      <Modal
        size="small"
        open={isPurchasingAlbum}
        onClose={() => setIsPurchasingAlbum(false)}
        title={`${t("buyingTrackGroup")} ${trackGroup.title}`}
      >
        <BuyTrackGroup trackGroup={trackGroup} />
      </Modal>
    </>
  );
};

export default PurchaseOrDownloadAlbum;
