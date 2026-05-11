import TipArtist from "components/common/TipArtist";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import Wishlist from "components/TrackGroup/Wishlist";
import React from "react";
import { useTranslation } from "react-i18next";

import useCurrentTrackHook from "./useCurrentTrackHook";

export type PlayLimit = {
  remaining: number;
  max: number;
  exceeded: boolean;
};

// Show the soft "free plays left" notice once the listener is within this
// many plays of the cap — gives them a heads-up without nagging on the very
// first listen (per #1760's discussion).
const PLAYS_REMAINING_NOTICE_THRESHOLD = 2;

const PlayingTrack: React.FC = () => {
  const { currentTrack, isLoading } = useCurrentTrackHook();

  if (!currentTrack || isLoading) {
    return null;
  }

  return (
    <div className="flex gap-1 mr-2">
      <Wishlist trackGroup={{ id: currentTrack.trackGroupId }} fixed />
      {currentTrack.trackGroup.artistId && (
        <TipArtist artistId={currentTrack.trackGroup.artistId} fixed />
      )}
      {currentTrack.trackGroup && (
        <PurchaseOrDownloadAlbum trackGroup={currentTrack.trackGroup} fixed />
      )}
    </div>
  );
};

const PlayLimitNotice: React.FC<{ playLimit: PlayLimit }> = ({ playLimit }) => {
  const { t } = useTranslation("translation", { keyPrefix: "player" });

  return (
    <>
      {playLimit.remaining === 0 && (
        <small
          data-cy="play-limit-exceeded-notice"
          className="block text-center py-1 px-2 opacity-[0.85] [color:var(--mi-error-text-color,inherit)]"
        >
          {t("thisIsYourLastPlay")}
        </small>
      )}
      {playLimit.remaining > 0 &&
        playLimit.remaining <= PLAYS_REMAINING_NOTICE_THRESHOLD && (
          <small
            data-cy="plays-remaining-notice"
            className="block text-center py-1 px-2 opacity-[0.85] [color:var(--mi-warning-text-color,inherit)]"
          >
            {t("playsRemaining", {
              count: playLimit.remaining,
            })}
          </small>
        )}
      <PlayingTrack />
    </>
  );
};

export default PlayLimitNotice;
