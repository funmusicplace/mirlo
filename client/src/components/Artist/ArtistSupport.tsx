import { css } from "@emotion/css";
import React from "react";
import { useLocation } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import Box from "../common/Box";
import Button from "../common/Button";
import Money from "../common/Money";

const ArtistSupport: React.FC<{ artist: Artist }> = ({ artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const { search } = useLocation();
  const snackbar = useSnackbar();
  const userId = user?.id;

  const checkForSubscription = React.useCallback(async () => {
    try {
      if (userId) {
        const { results: subscriptions } =
          await api.getMany<ArtistUserSubscription>(
            `users/${userId}/subscriptions?artistId=${artist.id}`
          );
        const subscriptionIds = subscriptions.map(
          (s) => s.artistSubscriptionTierId
        );
        const hasId = artist.subscriptionTiers.find((tier) =>
          subscriptionIds.includes(tier.id)
        );
        setIsSubscribed(!!hasId);
      }
    } catch (e) {
      console.error(e);
    }
  }, [artist.id, artist.subscriptionTiers, userId]);

  React.useEffect(() => {
    checkForSubscription();
  });

  React.useEffect(() => {
    const query = new URLSearchParams(search);
    let interval: NodeJS.Timer | null = null;
    if (query.get("subscribe") === "success") {
      setIsCheckingForSubscription(true);
      interval = setInterval(async () => {
        checkForSubscription();
      }, 1000 * 3);
    }
    return () => (interval ? clearInterval(interval) : undefined);
  }, [checkForSubscription, search]);

  const subscribeToTier = async (tier: ArtistSubscriptionTier) => {
    try {
      setIsCheckingForSubscription(true);

      const response = await api.post<
        { tierId: number },
        { sessionUrl: string }
      >(`artists/${artist.id}/subscribe`, {
        tierId: tier.id,
      });
      window.location.assign(response.sessionUrl);
    } catch (e) {
      snackbar("Something went wrong", { type: "success" });
      console.error(e);
    }
  };

  const ownedByUser = user && artist.userId === user?.id;

  if (!artist) {
    return null;
  }

  if (isSubscribed) {
    return <Box>Already subscribed!</Box>;
  }

  return (
    <>
      <h2>Support {artist.name}</h2>
      <div>
        {artist.subscriptionTiers?.map((p) => (
          <div
            key={p.id}
            className={css`
              margin-bottom: 1rem;
              margin-top: 1rem;
              padding-top: 1.5rem;
              display: flex;
              flex-direction: column;

              &:not(:first-child) {
                border-top: 1px solid #efefef;
              }
            `}
          >
            <div
              className={css`
                display: flex;
                justify-content: space-between;

                h3 {
                  font-size: 1.2rem;
                }
              `}
            >
              <h3>{p.name}</h3>
              <Money amount={p.minAmount} />
            </div>
            <p>{p.description}</p>
            <div
              className={css`
                margin-top: 0.5rem;
              `}
            >
              {!ownedByUser && (
                <Button
                  compact
                  onClick={() => subscribeToTier(p)}
                  isLoading={isCheckingForSubscription}
                  disabled={isCheckingForSubscription}
                >
                  Support at <Money amount={p.minAmount} /> / month
                </Button>
              )}
              {user && ownedByUser && (
                <Box
                  className={css`
                    text-align: center;
                  `}
                >
                  Users will be able to subscribe here
                </Box>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ArtistSupport;
