import Box from "components/common/Box";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistManageSubscription from "./ArtistManageSubscription";
import ArtistSupportBox from "./ArtistSupportBox";

const ArtistSupport: React.FC<{ artist: Artist }> = ({ artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [isLoading, setIsLoading] = React.useState(false);
  const [userSubscription, setUserSubscription] =
    React.useState<ArtistUserSubscription>();
  const [userSubscriptionTier, setUserSubscriptionTier] =
    React.useState<ArtistSubscriptionTier>();
  const { search } = useLocation();
  const userId = user?.id;

  const checkForSubscription = React.useCallback(async () => {
    try {
      setIsLoading(true);
      if (userId) {
        const { results: subscriptions } =
          await api.getMany<ArtistUserSubscription>(
            `users/${userId}/subscriptions?artistId=${artist.id}`
          );
        setUserSubscription(subscriptions[0]);
        const subscriptionIds = subscriptions.map(
          (s) => s.artistSubscriptionTierId
        );
        const hasId = artist.subscriptionTiers.find((tier) =>
          subscriptionIds.includes(tier.id)
        );
        setUserSubscriptionTier(hasId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [artist.id, artist.subscriptionTiers, userId]);

  React.useEffect(() => {
    checkForSubscription();
  }, [checkForSubscription]);

  React.useEffect(() => {
    const query = new URLSearchParams(search);
    let interval: NodeJS.Timer | null = null;
    if (query.get("subscribe") === "success") {
      interval = setTimeout(async () => {
        checkForSubscription();
      }, 1000 * 3);
    }
    return () => (interval ? clearTimeout(interval) : undefined);
  }, [checkForSubscription, search]);

  if (!artist) {
    return null;
  }

  if (isLoading) {
    return <Box />;
  }

  if (artist.subscriptionTiers.length === 0) {
    return (
      <Box style={{ marginTop: "1rem" }}>{t("noSubscriptionTiersYet")}</Box>
    );
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
      <h2>{t("support", { artist: artist.name })}</h2>
      <div>
        {artist.subscriptionTiers?.map((p) => (
          <ArtistSupportBox key={p.id} subscriptionTier={p} artist={artist} />
        ))}
      </div>
    </>
  );
};

export default ArtistSupport;
