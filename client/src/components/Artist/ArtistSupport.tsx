import React from "react";
import { useLocation } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistManageSubscription from "./ArtistManageSubscription";
import ArtistSupportBox from "./ArtistSupportBox";

const ArtistSupport: React.FC<{ artist: Artist }> = ({ artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [userSubscription, setUserSubscription] =
    React.useState<ArtistUserSubscription>();
  const [userSubscriptionTier, setUserSubscriptionTier] =
    React.useState<ArtistSubscriptionTier>();
  const { search } = useLocation();
  const userId = user?.id;

  const checkForSubscription = React.useCallback(async () => {
    try {
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
      <h2>Support {artist.name}</h2>
      <div>
        {artist.subscriptionTiers?.map((p) => (
          <ArtistSupportBox key={p.id} subscriptionTier={p} artist={artist} />
        ))}
      </div>
    </>
  );
};

export default ArtistSupport;
