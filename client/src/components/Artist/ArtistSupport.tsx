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
import { useArtistContext } from "state/ArtistContext";
import { useAuthContext } from "state/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY_AUTH, queryKeyIncludes } from "queries/queryKeys";

export const PostGrid = styled.div<{}>`
  display: grid;
  grid-template-columns: repeat(3, 31.6%);
  gap: 4% 2.5%;
  max-width: 100%;
  list-style-type: none;

  @media screen and (max-width: ${bp.large}px) {
    grid-template-columns: repeat(2, 48.75%);
  }

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: repeat(1, 100%);
    gap: 2%;
  }
`;

const ArtistSupport: React.FC = () => {
  const { user } = useAuthContext();

  const {
    state: { artist, userStripeStatus },
  } = useArtistContext();
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
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, userSubscriptions, artistTiers, artistId]);

  React.useEffect(() => {
    checkForSubscription();
  }, [checkForSubscription]);

  const queryClient = useQueryClient();
  React.useEffect(() => {
    const query = new URLSearchParams(search);
    let interval: NodeJS.Timer | null = null;
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

  if (!userStripeStatus?.chargesEnabled) {
    return (
      <div
        className={css`
          margin: 2rem 0;
        `}
      >
        {t("noSubscriptionTiersYet")}
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
          {t("noSubscriptionTiersYet")}
        </Box>
      )}
      <PostGrid>
        {artist.subscriptionTiers
          ?.filter((p) => !p.isDefaultTier)
          .map((p) => <ArtistSupportBox key={p.id} subscriptionTier={p} />)}
      </PostGrid>
    </>
  );
};

export default ArtistSupport;
