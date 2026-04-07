import Box from "components/common/Box";
import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import ArtistManageSubscription from "./ArtistManageSubscription";
import ArtistSupportBox from "./ArtistSupportBox";
import { css } from "@emotion/css";
import { bp } from "../../constants";
import FollowArtist from "components/common/FollowArtist";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { useAuthContext } from "state/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY_AUTH, queryKeyIncludes } from "queries/queryKeys";
import useErrorHandler from "services/useErrorHandler";
import useArtistQuery from "utils/useArtistQuery";
import { queryUserStripeStatus } from "queries";

const ArtistSupport: React.FC = () => {
  const { user } = useAuthContext();
  const { data: artist } = useArtistQuery();
  const { data: userStripeStatus, isPending } = useQuery(
    queryUserStripeStatus(artist?.userId || 0)
  );

  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [isLoading, setIsLoading] = React.useState(false);
  const [userSubscription, setUserSubscription] =
    React.useState<ArtistUserSubscription>();
  const [userSubscriptionTier, setUserSubscriptionTier] =
    React.useState<ArtistSubscriptionTier>();
  const { search } = useLocation();
  const userId = user?.id;
  const artistId = artist?.id;
  const userSubscriptions = user?.artistUserSubscriptions;
  const artistTiers = artist?.subscriptionTiers;
  const errorHandler = useErrorHandler();

  const checkForSubscription = React.useCallback(async () => {
    try {
      setIsLoading(true);
      if (userId) {
        const sub = userSubscriptions?.find(
          (aus) =>
            !aus.artistSubscriptionTier.isDefaultTier &&
            aus.artistSubscriptionTier.artistId === artistId
        );
        setUserSubscription(sub);

        const hasId = artistTiers?.find(
          (tier) => sub?.artistSubscriptionTierId === tier.id
        );
        setUserSubscriptionTier(hasId);
      }
    } catch (e) {
      errorHandler(e, true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, userSubscriptions, errorHandler, artistTiers, artistId]);

  React.useEffect(() => {
    checkForSubscription();
  }, [checkForSubscription]);

  const queryClient = useQueryClient();
  React.useEffect(() => {
    const query = new URLSearchParams(search);
    let interval: NodeJS.Timeout | null = null;
    if (query.get("subscribe") === "success") {
      interval = setTimeout(async () => {
        await queryClient.invalidateQueries({
          predicate: (query) => queryKeyIncludes(query, QUERY_KEY_AUTH),
        });
      }, 1000 * 3);
    }
    return () => (interval ? clearTimeout(interval) : undefined);
  }, [queryClient, search]);

  if (!artist) {
    return null;
  }

  if (!isPending && !userStripeStatus?.chargesEnabled) {
    return (
      <div
        className={css`
          margin: 2rem 0;
        `}
      >
        {t("noSubscriptionTiersYet", { artistName: artist.name })}
      </div>
    );
  }

  if (isLoading) {
    return <Box />;
  }

  if (userSubscriptionTier) {
    return (
      <ArtistManageSubscription
        userSubscription={userSubscription}
        reload={checkForSubscription}
        userSubscriptionTier={userSubscriptionTier}
      />
    );
  }

  const onlyOneTier =
    artist.subscriptionTiers.filter((tier) => !tier.isDefaultTier).length === 1;

  console.log("artist.subscriptionTiers", onlyOneTier);

  return (
    <>
      <SpaceBetweenDiv>
        <div />
        <div
          className={css`
            @media (max-width: ${bp.small}px) {
              margin-top: 0.15rem;
            }
          `}
        >
          <FollowArtist artistId={artist.id} />
        </div>
      </SpaceBetweenDiv>
      {artist.subscriptionTiers.length === 0 && (
        <Box
          className={css`
            text-align: center;
          `}
        >
          {t("noSubscriptionTiersYet", { artistName: artist.name })}
        </Box>
      )}
      <div
        className={
          "list-none gap-3 grid grid-cols-1 md:grid-cols-3 gap-1 list-none" +
          (onlyOneTier ? ` md:grid-cols-7` : ``)
        }
      >
        {artist.subscriptionTiers
          ?.filter((p) => !p.isDefaultTier)
          .map((p) => (
            <ArtistSupportBox
              key={p.id}
              subscriptionTier={p}
              className={onlyOneTier ? `col-start-3 col-span-3` : ``}
            />
          ))}
      </div>
    </>
  );
};

export default ArtistSupport;
