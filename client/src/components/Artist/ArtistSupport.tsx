import { css } from "@emotion/css";
import React from "react";
import { useLocation } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "../common/Box";
import Button from "../common/Button";
import ArtistSupportBox from "./ArtistSupportBox";

const ArtistSupport: React.FC<{ artist: Artist }> = ({ artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [userSubscriptionTier, setUserSubscriptionTier] =
    React.useState<ArtistSubscriptionTier>();
  const [userSubscription, setUserSubscription] =
    React.useState<ArtistUserSubscription>();
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

  const cancelSubscription = React.useCallback(async () => {
    try {
      if (userSubscription) {
        await api.delete(
          `users/${userId}/subscriptions/${userSubscription.id}`
        );
        await checkForSubscription();
      }
    } catch (e) {
      console.error(e);
    }
  }, [checkForSubscription, userId, userSubscription]);

  if (!artist) {
    return null;
  }

  if (userSubscriptionTier) {
    return (
      <Box>
        <p
          className={css`
            margin-bottom: 0.5rem;
          `}
        >
          You are supporting this artist at the{" "}
          <strong>{userSubscriptionTier.name}</strong> tier.
        </p>
        <Button compact color="warning" onClick={cancelSubscription}>
          Cancel subscription
        </Button>
      </Box>
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
