import { css } from "@emotion/css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ArtistManageSubscription from "components/Artist/ArtistManageSubscription";
import { ArtistOutletContext } from "components/Artist/artistOutletContext";
import ArtistSupportBox from "components/Artist/ArtistSupportBox";
import ScrollButton from "components/Artist/ScrollButton";
import SubscriptionTierPage from "components/Artist/SubscriptionTierPage";
import Box from "components/common/Box";
import TipArtist from "components/common/TipArtist";
import { queryUserStripeStatus } from "queries";
import { QUERY_KEY_AUTH, queryKeyIncludes } from "queries/queryKeys";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useOutletContext } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { isTipOnlyArtist } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

const Index: React.FC = () => {
  const { user } = useAuthContext();
  const { data: artist } = useArtistQuery();
  const { openTipModal } = useOutletContext<ArtistOutletContext>();
  const pageBackground = "var(--mi-background-color)";
  const { data: userStripeStatus, isPending } = useQuery(
    queryUserStripeStatus(artist?.userId || 0)
  );

  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [isLoading, setIsLoading] = React.useState(false);
  const [userSubscription, setUserSubscription] =
    React.useState<ArtistUserSubscription>();
  const [userSubscriptionTier, setUserSubscriptionTier] =
    React.useState<ArtistSubscriptionTier>();
  const [showAllTiers, setShowAllTiers] = React.useState(false);
  const tiersGridRef = React.useRef<HTMLDivElement>(null);
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

  React.useEffect(() => {
    if (showAllTiers) {
      tiersGridRef.current?.focus();
    }
  }, [showAllTiers]);

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

  const isTipOnly = artist ? isTipOnlyArtist(artist) : false;
  const canTip = !!userStripeStatus?.chargesEnabled;

  React.useEffect(() => {
    if (isTipOnly && canTip) {
      openTipModal();
    }
  }, [isTipOnly, canTip, openTipModal]);

  if (!artist) {
    return null;
  }

  if (
    !isPending &&
    !userStripeStatus?.chargesEnabled &&
    artist.userId !== user?.id
  ) {
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

  const paidTiers = artist.subscriptionTiers.filter((p) => !p.isDefaultTier);
  const paidTierCount = paidTiers.length;
  const isScrollable = paidTierCount > 3;
  const isOwner = artist.userId === user?.id;
  const subscribedTier =
    !isOwner && !showAllTiers ? userSubscriptionTier : undefined;

  return (
    <>
      {userSubscriptionTier && (
        <div className="mb-3">
          <ArtistManageSubscription
            userSubscription={userSubscription}
            reload={checkForSubscription}
            userSubscriptionTier={userSubscriptionTier}
          />
        </div>
      )}
      {paidTierCount === 0 && !artist.properties?.showTipOnSupportPage && (
        <Box
          className={css`
            text-align: center;
          `}
        >
          {t("noSubscriptionTiersYet", { artistName: artist.name })}
        </Box>
      )}
      {paidTierCount > 0 && artist.properties?.showTipOnSupportPage && (
        <div className="flex justify-end mb-3">
          <TipArtist
            artistId={artist.id}
            label={t("tipArtistByName", { artistName: artist.name }) ?? ""}
          />
        </div>
      )}
      {subscribedTier && (
        <SubscriptionTierPage
          subscriptionTier={subscribedTier}
          artist={artist}
          onSeeAllTiers={
            paidTierCount > 1 ? () => setShowAllTiers(true) : undefined
          }
        />
      )}
      {!subscribedTier && paidTierCount === 1 && (
        <SubscriptionTierPage subscriptionTier={paidTiers[0]} artist={artist} />
      )}
      {!subscribedTier && paidTierCount > 1 && (
        <div className="relative">
          {isScrollable && (
            <ScrollButton
              direction="left"
              scrollElementId="artist-support-tiers-scroll"
              ariaLabel={t("scrollLeft")}
              pageBackground={pageBackground}
            />
          )}

          <div
            id="artist-support-tiers-scroll"
            ref={tiersGridRef}
            tabIndex={-1}
            className={
              "list-none gap-3 " +
              (isScrollable
                ? `grid grid-cols-1 md:grid-cols-none md:grid-flow-col md:auto-cols-[30%] md:snap-x md:snap-mandatory md:overflow-x-scroll ${css`
                    &::-webkit-scrollbar {
                      display: none;
                    }
                    scrollbar-width: none;
                  `}`
                : `grid grid-cols-1 md:grid-cols-3`)
            }
          >
            {paidTiers.map((p) => (
              <div key={p.id} className="snap-center">
                <ArtistSupportBox subscriptionTier={p} />
              </div>
            ))}
          </div>

          {isScrollable && (
            <ScrollButton
              direction="right"
              scrollElementId="artist-support-tiers-scroll"
              ariaLabel={t("scrollRight")}
              pageBackground={pageBackground}
            />
          )}
        </div>
      )}
    </>
  );
};

export default Index;
