import React from "react";
import { css } from "@emotion/css";

import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import AddToCollection from "./AddToCollection";
import { useAuthContext } from "state/AuthContext";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryUserStripeStatus } from "queries";
import BackingThisProject from "./BackingThisProject";
import PurchaseAlbumModal from "./PurchaseAlbumModal";
import { bp } from "../../constants";

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  collapse?: boolean;
  fixed?: boolean;
  flex?: boolean;
}> = ({ trackGroup, track, collapse, fixed, flex }) => {
  const { user } = useAuthContext();
  const [isOwned, setIsOwned] = React.useState(false);
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: trackGroup.artist.urlSlug })
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
    (p) => p.fundraiserId === trackGroup.fundraiserId
  );

  if (trackGroup.fundraiser?.isAllOrNothing && hasPledge) {
    return (
      <BackingThisProject
        amount={hasPledge.amount}
        currency={trackGroup?.currency}
        collapse={collapse}
        trackGroup={trackGroup}
      />
    );
  }

  const isPublished =
    trackGroup.published ||
    (trackGroup.publishedAt && new Date(trackGroup.publishedAt) <= new Date());

  if (!isPublished) {
    return null;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

  const showPurchase = !isOwned;

  const showDownload = isOwned && !isBeforeReleaseDate;

  const addToCollection =
    !isOwned &&
    userId &&
    (trackGroup.minPrice === 0 || trackGroup.minPrice === null);

  return (
    <>
      <div
        className={css`
          z-index: 2;
          ${flex ? "display: flex; justify-content: end;" : ""};
          @media screen and (max-width: ${bp.medium}px) {
            display: block;

            ${flex ? "width: 100%;" : ""};
          }
        `}
      >
        {showPurchase && !addToCollection && (
          <PurchaseAlbumModal
            trackGroup={trackGroup}
            track={track}
            fixed={fixed}
            collapse={collapse}
          />
        )}
        {addToCollection && (
          <AddToCollection trackGroup={trackGroup} fixed={fixed} />
        )}
        {showDownload && !fixed && (
          <DownloadAlbumButton trackGroup={trackGroup} onlyIcon track={track} />
        )}
      </div>
    </>
  );
};

export default PurchaseOrDownloadAlbum;
