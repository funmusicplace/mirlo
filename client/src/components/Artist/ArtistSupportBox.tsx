import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import Box from "../common/Box";
import Button from "../common/Button";
import Money from "../common/Money";
import MarkdownContent from "components/common/MarkdownContent";
import { bp } from "../../constants";

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
          background-color: var(--mi-darken-background-color);
          max-width: 33%;
          margin-bottom: 1rem;
          margin-top: 1rem;
          padding-top: 1.5rem;
          display: flex;
          flex-direction: column;

          &:nth-child(3n + 1) {
            border-top: 0;
            margin-right: 0.5rem;
          }

          &:nth-child(3n) {
            border-top: 0;
            margin-left: 0.5rem;
          }

          @media (max-width: ${bp.small}px) {
            max-width: 100%;
            width: 100%;
            flex-grow: 1;
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
        <MarkdownContent content={subscriptionTier.description} />
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
                background-color: var(--mi-darken-background-color);
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
