import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import Money from "components/common/Money";
import React from "react";
import { FaArrowDown } from "react-icons/fa";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import ClickToPlay from "../common/ClickToPlay";
import SmallTileDetails from "../common/LargeTileDetail";

const ArtistTrackGroup: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
}> = ({ trackGroup, artist }) => {
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
      snackbar("Something went wrong", { type: "warning" });
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
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      key={trackGroup.id}
      className={css`
        margin-bottom: 1rem;
        margin-top: 1rem;
        padding-top: 1.5rem;
        border-top: 1px solid #efefef;

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
          title={trackGroup.title}
          subtitle={`Released: ${trackGroup.releaseDate.split("T")[0]}`}
        />
        <div style={{ flexGrow: 1 }} />
        {!userIsTrackGroupArtist && !isOwned && (
          <Button compact onClick={() => setIsPurchasingAlbum(true)}>
            Buy
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
              Download
            </Button>
          </>
        )}
      </div>
      <Modal
        size="small"
        open={isPurchasingAlbum}
        onClose={() => setIsPurchasingAlbum(false)}
      >
        <h3>Buying {trackGroup.title}</h3>
        Price:{" "}
        {trackGroup.minPrice && <Money amount={trackGroup.minPrice / 100} />}
        <Button onClick={purchaseAlbum}>Buy</Button>
      </Modal>
    </div>
  );
};

export default ArtistTrackGroup;
