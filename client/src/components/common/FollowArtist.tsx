import React from "react";
import Button from "./Button";
import api from "services/api";
import { FaCheck, FaMinus, FaPlus } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

import { useAuthContext } from "state/AuthContext";
import SupportArtistTiersForm from "./SupportArtistTiersForm";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { css } from "@emotion/css";
import Box from "./Box";

const FollowArtist: React.FC<{ artistId: number }> = ({ artistId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: `${artistId}`, includeDefaultTier: true })
  );

  const localArtistId = artistId ?? artist?.id;
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
        if (!isFollowing) {
          setIsFollowPopupOpen(true);
        }
      } else {
        setIsFollowPopupOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, localArtistId, refreshLoggedInUser, user]);

  if (!artist) {
    return null;
  }

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
          t(user ? "followingArtist" : "followArtist", {
            artistName: artist?.name,
          }) ?? ""
        }
      >
        {user && (
          <>
            <Box
              variant="success"
              className={css`
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                svg {
                  margin-right: 1rem;
                }
              `}
            >
              <FaCheck />
              {t("youveSubscribed", {
                artistName: artist?.name,
              })}
            </Box>
            <h3
              className={
                css`
                  margin-bottom: 0.5rem;
                  margin-top: 1rem;
                ` + " h4"
              }
            >
              {t("supportArtistFinancially", {
                artistName: artist?.name,
              })}
            </h3>
          </>
        )}
        {!user && (
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {t("chooseSupportLevel", {
              artistName: artist?.name,
            })}
          </p>
        )}
        <SupportArtistTiersForm artist={artist} excludeDefault={!!user} />
      </Modal>
      <Button
        size="compact"
        variant="outlined"
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
