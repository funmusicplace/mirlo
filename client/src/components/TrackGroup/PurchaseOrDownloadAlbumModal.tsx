import React from "react";
import { css } from "@emotion/css";

import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import AddToCollection from "./AddToCollection";
import { useAuthContext } from "state/AuthContext";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryUserStripeStatus } from "queries";
import BackingThisProject from "./BackingThisProject";
import PurchaseAlbumModal from "./PurchaseAlbumModal";

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  collapse?: boolean;
  fixed?: boolean;
}> = ({ trackGroup, track, collapse, fixed }) => {
  const { user } = useAuthContext();
  const [isOwned, setIsOwned] = React.useState(false);
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: trackGroup.artist.urlSlug })
  );
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

  console.log("pledges", user?.pledges, hasPledge, trackGroup.isAllOrNothing);

  if (trackGroup.isAllOrNothing && hasPledge) {
    console.log("showing backing");
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
