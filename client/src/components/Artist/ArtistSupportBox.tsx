import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import Box from "../common/Box";
import Money from "../common/Money";
import { useTranslation } from "react-i18next";
import MarkdownContent from "components/common/MarkdownContent";
import { bp } from "../../constants";
import PlatformPercent from "components/common/PlatformPercent";
import { useArtistContext } from "state/ArtistContext";
import LoadingBlocks from "./LoadingBlocks";
import styled from "@emotion/styled";
import ArtistVariableSupport, {
  SupportBoxButton,
} from "./ArtistVariableSupport";

const StyledSupportBox = styled(Box)`
  background-color: var(--mi-darken-background-color);
  margin-bottom: 1rem;
  padding: 0 1.5rem !important;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  outline: var(--mi-border);

  max-width: 32.3%;
  flex: 32.3%;

  &:nth-of-type(3n + 1) {
    margin-right: 1.5%;
  }

  &:nth-of-type(3n) {
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
`;

const ArtistSupportBox: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
}> = ({ subscriptionTier }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const {
    state: { user },
    refreshLoggedInUser,
  } = useGlobalStateContext();
  const {
    state: { artist },
    refresh,
  } = useArtistContext();
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
      >(`artists/${tier.artistId}/subscribe`, {
        tierId: tier.id,
      });
      window.location.assign(response.sessionUrl);
    } catch (e) {
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
      setIsCheckingForSubscription(false);
      refresh();
      refreshLoggedInUser();
    }
  };

  const cancelSubscription = async () => {
    try {
      await api.delete(`artists/${subscriptionTier.artistId}/subscribe`);
      refresh();
      refreshLoggedInUser();
    } catch (e) {
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
    }
  };

  if (!artist) {
    return <LoadingBlocks rows={2} />;
  }

  const isSubscribedToTier = !!user?.artistUserSubscriptions?.find(
    (sub) => sub.artistSubscriptionTier.id === subscriptionTier.id
  );

  const isSubscribedToArtist = !!user?.artistUserSubscriptions?.find(
    (sub) =>
      sub.artistSubscriptionTier.artistId === artist.id &&
      sub.artistSubscriptionTier.id !== subscriptionTier.id
  );

  const ownedByUser = user && artist.userId === userId;

  return (
    <StyledSupportBox>
      <div
        className={css`
          padding: 1.5rem 0;
          border-bottom: var(--mi-border);
          text-align: center;
          h3 {
            font-size: 1.2rem;
            padding-bottom: 0.5rem;
          }
          @media screen and (max-width: ${bp.small}px) {
            padding: 1rem;
          }
        `}
      >
        <h3
          className={css`
            text-transform: Capitalize;
          `}
        >
          {subscriptionTier.name}
        </h3>
        <Money
          amount={
            subscriptionTier.minAmount ? subscriptionTier.minAmount / 100 : 0
          }
          currency={subscriptionTier.currency}
        />{" "}
        / {t("month")}
      </div>
      <div
        className={css`
          padding-top: 1rem;
          height: 100%;
          p {
            display: flex;
            align-items: flex-start;
          }
          @media screen and (max-width: ${bp.small}px) {
          }
        `}
      >
        <MarkdownContent content={subscriptionTier.description} />
      </div>
      <div
        className={css`
          margin: 0.5rem 0;

          button:hover {
            background-color: var(--mi-normal-foreground-color) !important;
            color: var(--mi-normal-background-color);
          }
        `}
      >
        {!ownedByUser && !isSubscribedToTier && !isSubscribedToArtist && (
          <>
            <ArtistVariableSupport tier={subscriptionTier} />

            <PlatformPercent
              percent={subscriptionTier.platformPercent}
              chosenPrice={
                subscriptionTier?.minAmount
                  ? subscriptionTier.minAmount / 100
                  : 0
              }
            />
          </>
        )}
        {(isSubscribedToTier || ownedByUser || isSubscribedToArtist) && (
          <Box
            className={css`
              text-align: center;
              background-color: var(--mi-darken-background-color);
              margin-bottom: 0;
            `}
          >
            <p>
              {ownedByUser && t("ableToSupport")}
              {isSubscribedToArtist &&
                !isSubscribedToTier &&
                t("areSupporting")}
              {isSubscribedToTier && t("supportAtThisTier")}
            </p>
            {user && isSubscribedToArtist && !isSubscribedToTier && (
              <SupportBoxButton
                onClick={() => subscribeToTier(subscriptionTier)}
                isLoading={isCheckingForSubscription}
              >
                {t("chooseThisSubscription")}
              </SupportBoxButton>
            )}
            {user && isSubscribedToTier && (
              <SupportBoxButton onClick={() => cancelSubscription()}>
                {t("cancelSubscription")}
              </SupportBoxButton>
            )}
          </Box>
        )}
      </div>
    </StyledSupportBox>
  );
};

export default ArtistSupportBox;
