import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import Money from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowDown } from "react-icons/fa";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import ClickToPlay from "../common/ClickToPlay";
import SmallTileDetails from "../common/LargeTileDetail";
import { Link } from "react-router-dom";
import BuyTrackGroup from "components/TrackGroup/Buy";

const ArtistTrackGroup: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
}> = ({ trackGroup, artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const [isPurchasingAlbum, setIsPurchasingAlbum] = React.useState(false);
  const [isOwned, setIsOwned] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
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
  });

  if (!trackGroup) {
    return null;
  }

  const userIsTrackGroupArtist = user && artist.userId === user?.id;

  const purchaseAlbum = async () => {
    try {
      setIsPurchasingAlbum(true);

      const response = await api.post<{}, { sessionUrl: string }>(
        `trackGroups/${trackGroup.id}/purchase`,
        {}
      );
      window.location.assign(response.sessionUrl);
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  };

  const downloadAlbum = async () => {
    try {
      setIsDownloading(true);
      await api.getFile(
        trackGroup.title,
        `trackGroups/${trackGroup.id}/download`,
        "application/zip"
      );
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const date = new Date(trackGroup.releaseDate);

  return (
    <div
      key={trackGroup.id}
      className={css`
        margin-bottom: 1rem;
        margin-top: 1rem;

        &:nth-child(2) {
          border-top: 0;
        }
      `}
    >
      <div
        className={css`
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          & > :first-child {
            margin-right: 0.5rem;
          }
        `}
      >
        <ClickToPlay
          image={{
            width: 120,
            height: 120,
            url: trackGroup.cover?.sizes?.[120] ?? "",
          }}
          trackGroupId={trackGroup.id}
          title={trackGroup.title}
        />
        <SmallTileDetails
          title={
            <Link
              to={`/${artist.urlSlug ?? trackGroup.artistId}/tg/${
                trackGroup.urlSlug ?? trackGroup.id
              }`}
            >
              {trackGroup.title}
            </Link>
          }
          subtitle={
            <em>
              {t("released", {
                date: date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                }),
              })}
            </em>
          }
        />
        <div style={{ flexGrow: 1 }} />
        {!userIsTrackGroupArtist && !isOwned && (
          <Button compact onClick={() => setIsPurchasingAlbum(true)}>
            {t("buy")}
          </Button>
        )}
        {isOwned && (
          <>
            <Button
              compact
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
        title={`Buying ${trackGroup.title}`}
      >
        <BuyTrackGroup trackGroup={trackGroup} />
      </Modal>
    </div>
  );
};

export default ArtistTrackGroup;
