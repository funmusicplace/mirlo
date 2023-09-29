import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import Box from "../common/Box";
import Button from "../common/Button";
import Money from "../common/Money";

const ArtistSupportBox: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
  artist: Artist;
}> = ({ subscriptionTier, artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  React.useState<ArtistSubscriptionTier>();
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const snackbar = useSnackbar();
  const userId = user?.id;

  const subscribeToTier = async (tier: ArtistSubscriptionTier) => {
    try {
      setIsCheckingForSubscription(true);

      const response = await api.post<
        { tierId: number },
        { sessionUrl: string }
      >(`artists/${subscriptionTier.artistId}/subscribe`, {
        tierId: tier.id,
      });
      window.location.assign(response.sessionUrl);
    } catch (e) {
      snackbar("Something went wrong", { type: "success" });
      console.error(e);
    }
  };

  const ownedByUser = user && artist.userId === userId;

  return (
    <>
      <Box
        key={subscriptionTier.id}
        className={css`
          margin-bottom: 1rem;
          margin-top: 1rem;
          padding-top: 1.5rem;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--mi-lighter-foreground-color);

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
          <h3>{subscriptionTier.name}</h3>
          <Money
            amount={
              subscriptionTier.minAmount ? subscriptionTier.minAmount / 100 : 0
            }
          />
        </div>
        <p>{subscriptionTier.description}</p>
        <div
          className={css`
            margin-top: 0.5rem;
          `}
        >
          {user && !ownedByUser && (
            <Button
              compact
              onClick={() => subscribeToTier(subscriptionTier)}
              isLoading={isCheckingForSubscription}
              disabled={isCheckingForSubscription}
            >
              Support at{" "}
              <Money
                amount={
                  subscriptionTier.minAmount
                    ? subscriptionTier.minAmount / 100
                    : 0
                }
              />{" "}
              / month
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
      </Box>
    </>
  );
};

export default ArtistSupportBox;
