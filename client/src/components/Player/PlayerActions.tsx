import { css } from "@emotion/css";
import DropdownMenu, { useDropdownMenu } from "components/common/DropdownMenu";
import { DropdownMenuItemButton } from "components/common/DropdownMenuItem";
import { FixedButton } from "components/common/FixedButton";
import Modal from "components/common/Modal";
import TipArtist from "components/common/TipArtist";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import Wishlist from "components/TrackGroup/Wishlist";
import React from "react";
import { useTranslation } from "react-i18next";
import { IoIosHeart, IoIosHeartEmpty } from "react-icons/io";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";

import useCurrentTrackHook from "./useCurrentTrackHook";

const PlayerActions: React.FC = () => {
  const { state } = useGlobalStateContext();
  const { currentTrack, isLoading } = useCurrentTrackHook();

  if (!state.playing) {
    return null;
  }

  if (!currentTrack || isLoading) {
    return null;
  }

  const trackGroup = currentTrack.trackGroup;

  if (!trackGroup) {
    return null;
  }

  const totalTracks = trackGroup.totalTracks ?? trackGroup.tracks?.length ?? 1;
  const isMultiTrack = totalTracks > 1;

  return (
    <div
      data-cy="player-actions"
      className={css`
        z-index: 10;
        bottom: var(--player-actions-bottom-offset, 80px);
        right: 1rem;
        position: fixed;
        display: flex;
        gap: 0.5rem;

        @media (max-width: 768px) {
          bottom: var(
            --player-actions-bottom-offset-mobile,
            var(--player-actions-bottom-offset, 80px)
          );
          right: 0.5rem;
        }
      `}
    >
      {isMultiTrack ? (
        <WishlistTargetMenu track={currentTrack} trackGroup={trackGroup} />
      ) : (
        <Wishlist trackGroup={{ id: trackGroup.id }} fixed />
      )}
      {trackGroup.artistId && (
        <TipArtist artistId={trackGroup.artistId} fixed />
      )}
      {isMultiTrack ? (
        <BuyTargetMenu track={currentTrack} trackGroup={trackGroup} />
      ) : (
        <PurchaseOrDownloadAlbum trackGroup={trackGroup} fixed />
      )}
    </div>
  );
};

const WishlistTargetMenu: React.FC<{
  track: Track;
  trackGroup: NonNullable<Track["trackGroup"]>;
}> = ({ track, trackGroup }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "wishlist" });

  const [albumInWishlist, setAlbumInWishlist] = React.useState(
    !!user?.wishlist?.find((w) => w.trackGroupId === trackGroup.id)
  );
  const [trackInWishlist, setTrackInWishlist] = React.useState(
    !!user?.trackFavorites?.find((w) => w.trackId === track.id)
  );

  if (!user) {
    return null;
  }

  const toggleAlbum = async () => {
    const next = !albumInWishlist;
    await api.post(`trackGroups/${trackGroup.id}/wishlist`, { wishlist: next });
    setAlbumInWishlist(next);
  };

  const toggleTrack = async () => {
    const next = !trackInWishlist;
    await api.post(`tracks/${track.id}/favorite`, { favorite: next });
    setTrackInWishlist(next);
  };

  const anyInWishlist = albumInWishlist || trackInWishlist;
  const triggerLabel = anyInWishlist
    ? t("openWishlistMenuActive")
    : t("openWishlistMenu");

  const trigger = (
    <FixedButton
      aria-label={triggerLabel}
      className="wishlist max-md:justify-center!"
      title={triggerLabel}
      rounded
      size="compact"
      endIcon={anyInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
    />
  );

  return (
    <DropdownMenu trigger={trigger}>
      <ul>
        <WishlistMenuItem
          active={trackInWishlist}
          onToggle={toggleTrack}
          labelAdd={t("wishlistThisTrack")}
          labelRemove={t("removeTrackFromWishlist")}
        />
        <WishlistMenuItem
          active={albumInWishlist}
          onToggle={toggleAlbum}
          labelAdd={t("wishlistThisAlbum")}
          labelRemove={t("removeAlbumFromWishlist")}
        />
      </ul>
    </DropdownMenu>
  );
};

const WishlistMenuItem: React.FC<{
  active: boolean;
  onToggle: () => void | Promise<void>;
  labelAdd: string;
  labelRemove: string;
}> = ({ active, onToggle, labelAdd, labelRemove }) => {
  const menu = useDropdownMenu();
  const label = active ? labelRemove : labelAdd;
  return (
    <li>
      <DropdownMenuItemButton
        startIcon={active ? <IoIosHeart /> : <IoIosHeartEmpty />}
        onClick={async () => {
          await onToggle();
          menu?.close();
        }}
      >
        {label}
      </DropdownMenuItemButton>
    </li>
  );
};

const BuyTargetMenu: React.FC<{
  track: Track;
  trackGroup: NonNullable<Track["trackGroup"]>;
}> = ({ track, trackGroup }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "player" });
  const { t: tCard } = useTranslation("translation", {
    keyPrefix: "trackGroupCard",
  });
  const [buyTarget, setBuyTarget] = React.useState<"track" | "album" | null>(
    null
  );

  if (!trackGroup.isGettable) {
    return null;
  }

  const albumOwned = !!user?.userTrackGroupPurchases?.find(
    (p) => p.trackGroupId === trackGroup.id
  );
  const trackOwned =
    !!user?.userTrackPurchases?.find((p) => p.trackId === track.id) ||
    (track.isPreview && albumOwned);

  if (albumOwned && trackOwned) {
    return null;
  }

  const payOrNameYourPrice =
    trackGroup.minPrice === 0 ? "nameYourPriceLabel" : "buy";
  const preOrderOrBuyText =
    trackGroup.minPrice === null
      ? "saveAlbum"
      : trackGroup.fundraiser?.isAllOrNothing
        ? "backThisProject"
        : trackGroup.isPreorder
          ? "preOrder"
          : payOrNameYourPrice;
  const purchaseTitle = trackGroup.isPreorder
    ? "preOrderingTrackGroup"
    : "buyingTrackGroup";

  const modalTitle =
    buyTarget === "track"
      ? tCard(purchaseTitle, { title: track.title })
      : tCard(purchaseTitle, { title: trackGroup.title });

  const trigger = (
    <FixedButton rounded size="compact">
      {tCard(preOrderOrBuyText)}
    </FixedButton>
  );

  return (
    <>
      <DropdownMenu trigger={trigger}>
        <ul>
          <BuyMenuItem
            show={!trackOwned}
            label={t("buyThisTrack")}
            onSelect={() => setBuyTarget("track")}
          />
          <BuyMenuItem
            show={!albumOwned}
            label={t("buyThisAlbum")}
            onSelect={() => setBuyTarget("album")}
          />
        </ul>
      </DropdownMenu>
      <Modal
        size="small"
        open={!!buyTarget}
        onClose={() => setBuyTarget(null)}
        title={modalTitle}
        noPadding
      >
        <BuyTrackGroup
          trackGroup={trackGroup}
          track={buyTarget === "track" ? track : undefined}
        />
      </Modal>
    </>
  );
};

const BuyMenuItem: React.FC<{
  show: boolean;
  label: string;
  onSelect: () => void;
}> = ({ show, label, onSelect }) => {
  const menu = useDropdownMenu();
  if (!show) {
    return null;
  }
  return (
    <li>
      <DropdownMenuItemButton
        onClick={() => {
          onSelect();
          menu?.close();
        }}
      >
        {label}
      </DropdownMenuItemButton>
    </li>
  );
};

export default PlayerActions;
