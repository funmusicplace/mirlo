import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { isTrackGroupPublished } from "utils/artist";

import { bp } from "../../constants";

import BackingThisProject from "./BackingThisProject";
import PurchaseAlbumModal from "./PurchaseAlbumModal";

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  collapse?: boolean;
  fixed?: boolean;
  flex?: boolean;
}> = ({ trackGroup, track, collapse, fixed, flex }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
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
          ? trackPurchases?.find((p) => p.trackId === track.id) ||
            (track.isPreview &&
              trackGroupPurchases?.find(
                (p) => p.trackGroupId === trackGroup.id
              ))
          : trackGroupPurchases?.find((p) => p.trackGroupId === trackGroup.id);

        setIsOwned(!!purchased);
      }
    } catch (e) {
      console.error(e);
    }
  }, [trackPurchases, trackGroupPurchases, trackGroup.id, userId, track]);

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

  const isPublished = isTrackGroupPublished(trackGroup);

  if (!isPublished) {
    if (
      !(
        user &&
        (artist.userId === user.id ||
          artist.paymentToUserId === user.id ||
          user.isAdmin)
      )
    ) {
      return null;
    }
  }

  const showPurchase = !isOwned;

  const showPreOrdered =
    isOwned && trackGroup.isPreorder && !(track?.isPreview ?? false);

  const showDownload =
    isOwned && (!trackGroup.isPreorder || (track?.isPreview ?? false));

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
        {showPurchase && (
          <PurchaseAlbumModal
            trackGroup={trackGroup}
            track={track}
            fixed={fixed}
            collapse={collapse}
          />
        )}
        {showPreOrdered && (
          <ArtistButton
            variant="outlined"
            disabled
            aria-disabled="true"
            className={css`
              font-size: 1rem !important;
              padding-left: 2rem !important;
              padding-right: 2rem !important;
              opacity: 0.6;
              cursor: default;

              @media screen and (max-width: ${bp.medium}px) {
                width: 100%;
              }
            `}
          >
            {t("preOrdered")}
          </ArtistButton>
        )}
        {showDownload && !fixed && (
          <DownloadAlbumButton trackGroup={trackGroup} onlyIcon track={track} />
        )}
      </div>
    </>
  );
};

export default PurchaseOrDownloadAlbum;
