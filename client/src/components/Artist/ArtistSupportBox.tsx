import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import Box from "../common/Box";
import Button from "../common/Button";
import Money from "../common/Money";
import { useTranslation } from "react-i18next";
import MarkdownContent from "components/common/MarkdownContent";
import { bp } from "../../constants";

const ArtistSupportBox: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
  artist: Artist;
}> = ({ subscriptionTier, artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
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
          margin-bottom: 1rem;
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          outline: solid 1px grey;

          max-width: 32.3%;
          flex: 32.3%;

          button {
            width: 100%;
            white-space: normal !important;
            margin-top: 1rem;
            padding: 0.5rem 0.5rem;
          }

          &:nth-child(3n + 1) {
            margin-right: 1.5%;
          }

          &:nth-child(3n) {
            margin-left: 1.5%;
          }

          @media screen and (max-width: ${bp.medium}px) {
            h3 {
              font-size: 1rem;
            }
            max-width: 48.7%;
            flex: 48.7%;

            margin-bottom: 0rem;
            margin-top: 0.5rem;

            &:nth-child(odd) {
              margin-left: 0rem;
              margin-right: 2.5%;
            }
          }

          @media screen and (max-width: ${bp.small}px) {
            h3 {
              font-size: 1rem;
            }

            font-size: 0.875rem;
            max-width: 100%;
            flex: 100%;
            &:nth-child(odd) {
              margin-right: 0rem;
            }
          }
        `}
      >
        <div
          className={css`
            padding: 1.5rem;
            border-bottom: solid 1px grey;
            h3 {
              font-size: 1rem;
              padding-bottom: 0.5rem;
            }
            @media screen and (max-width: ${bp.small}px) {
              padding: 1rem;
            }
          `}
        >
          <h3>{subscriptionTier.name}</h3>
          <Money
            amount={
              subscriptionTier.minAmount ? subscriptionTier.minAmount / 100 : 0
            }
          />{" "}
          / {t("month")}
        </div>
        <div
          className={css`
            padding: 1.5rem 1.5rem 0 1.5rem;
            height: 100%;
            p {
              display: flex;
              align-items: flex-start;
            }
            @media screen and (max-width: ${bp.small}px) {
              padding: 1rem 1rem 0 1rem;
            }
          `}
        >
          <MarkdownContent content={subscriptionTier.description} />
        </div>
        <div
          className={css`
            margin: 0rem 0.5rem 0.5rem 0.5rem;

            button {
              margin: 0;
            }
            button:hover {
              background-color: var(--mi-normal-foreground-color) !important;
              color: var(--mi-normal-background-color);
            }
          `}
        >
          {!ownedByUser && (
            <Button
              compact
              uppercase
              onClick={() => subscribeToTier(subscriptionTier)}
              isLoading={isCheckingForSubscription}
              disabled={isCheckingForSubscription}
            >
              Support
            </Button>
          )}
          {user && ownedByUser && (
            <Box
              className={css`
                text-align: center;
                background-color: var(--mi-darken-background-color);
                margin-bottom: 0;
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
