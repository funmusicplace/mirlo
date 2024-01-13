import React from "react";
import Button from "./Button";
import api from "services/api";
import { FaMinus, FaPlus } from "react-icons/fa";
import { useArtistContext } from "state/ArtistContext";
import { useGlobalStateContext } from "state/GlobalState";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

import FollowArtistNotLoggedInForm from "./FollowArtistNotLoggedInForm";

const FollowArtist: React.FC<{ artistId: number }> = ({ artistId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const {
    state: { user },
    refreshLoggedInUser,
  } = useGlobalStateContext();
  const artistContext = useArtistContext();
  const localArtistId = artistId ?? artistContext?.state?.artist?.id;
  const artistUserSubscriptions = user?.artistUserSubscriptions;
  const [isSubscribed, setIsSubscribed] = React.useState(
    !!user?.artistUserSubscriptions?.find(
      (aus) =>
        aus.artistSubscriptionTier.artistId &&
        !aus.artistSubscriptionTier.isDefaultTier
    )
  );
  const [isFollowing, setIsFollowing] = React.useState(
    !!user?.artistUserSubscriptions?.find(
      (aus) =>
        aus.artistSubscriptionTier.artistId === localArtistId &&
        aus.artistSubscriptionTier.isDefaultTier
    )
  );

  const [isFollowPopupOpen, setIsFollowPopupOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const found = artistUserSubscriptions?.find(
      (aus) =>
        aus.artistSubscriptionTier.isDefaultTier &&
        aus.artistSubscriptionTier.artistId === localArtistId
    );
    setIsFollowing(!!found);

    const foundSubscribed = artistUserSubscriptions?.find(
      (aus) =>
        !aus.artistSubscriptionTier.isDefaultTier &&
        aus.artistSubscriptionTier.artistId === localArtistId
    );
    setIsSubscribed(!!foundSubscribed);
  }, [artistUserSubscriptions, localArtistId]);

  const onFollowClick = React.useCallback(async () => {
    try {
      if (user) {
        setIsLoading(true);
        await api.post(
          `artists/${localArtistId}/${isFollowing ? "unfollow" : "follow"}`,
          {}
        );
        await refreshLoggedInUser();
      } else {
        setIsFollowPopupOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, localArtistId, refreshLoggedInUser, user]);

  if (isSubscribed) {
    return <>Subscribed</>;
  }

  return (
    <>
      <Modal
        size="small"
        open={isFollowPopupOpen}
        onClose={() => setIsFollowPopupOpen(false)}
        title={
          t("followArtist", {
            artistName: artistContext.state?.artist?.name,
          }) ?? ""
        }
      >
        <FollowArtistNotLoggedInForm artistId={localArtistId} />
      </Modal>
      <Button
        compact
        transparent
        type="button"
        onClick={onFollowClick}
        isLoading={isLoading}
        startIcon={isFollowing ? <FaMinus /> : <FaPlus />}
      >
        {t(isFollowing ? "unfollow" : "follow")}
      </Button>
    </>
  );
};

export default FollowArtist;
