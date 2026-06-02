import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { ButtonProps } from "components/common/Button";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaMinus, FaPlus } from "react-icons/fa";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import useIsSubscribedToArtist from "utils/useIsSubscribedToArtist";

import Box from "./Box";
import Modal from "./Modal";
import SupportArtistTiersForm from "./SupportArtistTiersForm";

const FollowArtist: React.FC<{
  artistId: number;
  hideWhenSubscribed?: boolean;
  variant?: ButtonProps["variant"];
}> = ({ artistId, hideWhenSubscribed, variant = "outlined" }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: `${artistId}`, includeDefaultTier: true })
  );

  const localArtistId = artistId ?? artist?.id;
  const artistUserSubscriptions = user?.artistUserSubscriptions;
  const isSubscribed = useIsSubscribedToArtist(localArtistId);
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
    if (hideWhenSubscribed) return null;
    return <>{t("isSubscribed")}</>;
  }

  const hasNoneDefaultSubscriptionTiers = artist.subscriptionTiers.find(
    (t) => !t.isDefaultTier
  );

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
            {hasNoneDefaultSubscriptionTiers && (
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
            )}
          </>
        )}
        {!user && (
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {t(
              hasNoneDefaultSubscriptionTiers
                ? "chooseSupportLevel"
                : "enterEmailToSubscribeToNewsletter",
              {
                artistName: artist?.name,
              }
            )}
          </p>
        )}
        {(hasNoneDefaultSubscriptionTiers || !user) && (
          <SupportArtistTiersForm artist={artist} excludeDefault={!!user} />
        )}
      </Modal>

      <ArtistButton
        size="compact"
        variant={variant}
        type="button"
        onClick={onFollowClick}
        isLoading={isLoading}
        startIcon={isFollowing ? <FaMinus /> : <FaPlus />}
        className={css`
          font-size: 0.75em !important;
          ${variant === "outlined"
            ? "background-color: var(--mi-button-tint-color) !important;"
            : ""}
        `}
      >
        {t(isFollowing ? "unfollow" : "follow")}
      </ArtistButton>
    </>
  );
};

export default FollowArtist;
