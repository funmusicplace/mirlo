import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowDown } from "react-icons/fa";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import BuyTrackGroup from "components/TrackGroup/Buy";
import { useArtistContext } from "state/ArtistContext";

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const [isOwned, setIsOwned] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { state } = useArtistContext();

  const userId = user?.id;
  const loggedInUserIsAdmin = user?.isAdmin;

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

  const downloadAlbum = async () => {
    try {
      setIsDownloading(true);
      await api.downloadFileDirectly(
        `trackGroups/${trackGroup.id}/download`,
        `${trackGroup.title}.zip`
      );
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

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
        {(userIsTrackGroupArtist || isOwned || loggedInUserIsAdmin) && (
          <>
            <Button
              compact
              collapse
              isLoading={isDownloading}
              startIcon={<FaArrowDown />}
              onClick={() => downloadAlbum()}
            >
              {t("download")}
            </Button>
          </>
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
