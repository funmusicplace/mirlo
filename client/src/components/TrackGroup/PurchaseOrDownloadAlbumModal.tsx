import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { canUserEditArtist, isTrackGroupPublished } from "utils/artist";

import { bp } from "../../constants";

import BackingThisProject from "./BackingThisProject";
import PurchaseAlbumModal from "./PurchaseAlbumModal";

export const useReleasePurchaseState = ({
  trackGroup,
  track,
  singleTrack: explicitSingleTrack,
  hidePurchase,
}: {
  trackGroup: TrackGroup;
  track?: Track;
  singleTrack?: Track;
  hidePurchase?: boolean;
}) => {
  const { user } = useAuthContext();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: trackGroup.artist.urlSlug })
  );

  const singleTrack = track
    ? undefined
    : (explicitSingleTrack ??
      (trackGroup.totalTracks === 1 && trackGroup.tracks?.length === 1
        ? trackGroup.tracks[0]
        : undefined));
  const pledge = user?.pledges?.find(
    (p) => p.fundraiserId === trackGroup.fundraiserId
  );
  const showBacking =
    trackGroup.isGettable &&
    !!trackGroup.fundraiser?.isAllOrNothing &&
    !!pledge;

  const ownsWholeRelease = !!user?.userTrackGroupPurchases?.some(
    (p) => p.trackGroupId === trackGroup.id
  );
  const ownsTrack = (candidate?: Track) =>
    !!candidate &&
    !!user?.userTrackPurchases?.some((p) => p.trackId === candidate.id);

  const isOwned = track
    ? ownsTrack(track) || ownsWholeRelease
    : ownsWholeRelease || ownsTrack(singleTrack);

  const canSeeActions =
    !!artist &&
    (isTrackGroupPublished(trackGroup) ||
      (!!user &&
        (canUserEditArtist(user, artist) ||
          artist.paymentToUserId === user.id)));

  const ownedTrack = track ?? singleTrack;
  const showPurchase = trackGroup.isGettable && !hidePurchase && !isOwned;
  const showPreOrdered =
    isOwned && trackGroup.isPreorder && !ownedTrack?.isPreview;
  const showDownload =
    isOwned && (!trackGroup.isPreorder || !!ownedTrack?.isPreview);
  const downloadTrack =
    track ??
    (singleTrack && (!ownsWholeRelease || trackGroup.isPreorder)
      ? singleTrack
      : undefined);

  return {
    artist,
    pledge,
    showBacking,
    showPurchase,
    showPreOrdered,
    showDownload,
    downloadTrack,
    isVisible:
      !!artist &&
      (showBacking ||
        (canSeeActions && (showPurchase || showPreOrdered || showDownload))),
  };
};

const PurchaseOrDownloadAlbum: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  collapse?: boolean;
  fixed?: boolean;
  flex?: boolean;
  hidePurchase?: boolean;
  singleTrack?: Track;
}> = ({
  trackGroup,
  track,
  collapse,
  fixed,
  flex,
  hidePurchase,
  singleTrack,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const {
    artist,
    pledge,
    showBacking,
    showPurchase,
    showPreOrdered,
    showDownload,
    downloadTrack,
    isVisible,
  } = useReleasePurchaseState({ trackGroup, track, singleTrack, hidePurchase });

  if (!trackGroup || !artist) {
    return null;
  }

  if (fixed && !showBacking && !showPurchase && !showPreOrdered) {
    return null;
  }

  if (showBacking && pledge) {
    return (
      <BackingThisProject
        amount={pledge.amount}
        currency={trackGroup?.currency}
        collapse={collapse}
        trackGroup={trackGroup}
      />
    );
  }

  if (!isVisible) {
    return null;
  }

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
            compact={collapse}
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
          <DownloadAlbumButton
            trackGroup={trackGroup}
            onlyIcon={collapse}
            track={downloadTrack}
          />
        )}
      </div>
    </>
  );
};

export default PurchaseOrDownloadAlbum;
