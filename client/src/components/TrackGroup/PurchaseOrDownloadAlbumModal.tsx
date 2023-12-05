import Modal from "components/common/Modal";
import React from "react";
import { bp } from "../../constants";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
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
  const { trackGroupId } = useParams();
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

  if (!trackGroup || !artistState?.artist) {
    return null;
  }

  // FIXME: remove once we have a real stripe account
  if (!userId) {
    return null;
  }

  const userIsTrackGroupArtist =
    user && artistState?.artist.userId === user?.id;

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

  const purchaseText = isBeforeReleaseDate ? "preOrder" : "buy";
  const purchaseTitle = isBeforeReleaseDate
    ? "preOrderingTrackGroup"
    : "buyingTrackGroup";

  if (isBeforeReleaseDate && !userId) {
    return null;
  }

  return (
    <>
      <div>
        {!userIsTrackGroupArtist &&
          !isOwned &&
          artistState?.userStripeStatus?.chargesEnabled && (
            <div
              className={css`
                margin-top: 0rem;
              `}
            >
              <Button
                variant="outlined"
                className={css`
                  display: block !important;
                  ${!trackGroupId ? "display: none !important;" : ""}
                  height: 2rem !important;

                  @media screen and (max-width: ${bp.small}px) {
                    display: none !important;
                    font-size: var(--mi-font-size-xsmall);
                    padding: 0;
                    font-size: 0.75rem;
                  }
                `}
                compact
                onClick={() => setIsPurchasingAlbum(true)}
              >
                {t(purchaseText)}
              </Button>
              <Button
                variant="link"
                className={css`
                  display: none !important;
                  ${!trackGroupId ? "display: block !important;" : ""}
                  color: var(--mi-normal-foreground-color) !important;
                  margin: 0.01rem 0 0 0.3rem !important;
                  &:hover {
                    text-decoration: underline;
                  }
                  font-size: var(--mi-font-size-xsmall);
                  font-size: 0.75rem;

                  @media screen and (max-width: ${bp.small}px) {
                    display: block !important;
                  }
                `}
                compact
                onClick={() => setIsPurchasingAlbum(true)}
              >
                {t(purchaseText)}
              </Button>
            </div>
          )}
        {(userIsTrackGroupArtist || isOwned) && !isBeforeReleaseDate && (
          <DownloadAlbumButton trackGroup={trackGroup} />
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
