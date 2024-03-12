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
  padding: 0 1.5rem 0.25rem 1.5rem !important;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  outline: var(--mi-border);

  @media screen and (max-width: ${bp.medium}px) {
    h3 {
      font-size: 1rem;
    }
  }

  @media screen and (max-width: ${bp.small}px) {
    font-size: var(--mi-font-size-small);
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
      sub.artistSubscriptionTier.id !== subscriptionTier.id &&
      !sub.artistSubscriptionTier.isDefaultTier
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
            align-items: flex-start;
          }
        `}
      >
        <MarkdownContent content={subscriptionTier.description} />
      </div>
      <div
        className={css`
          margin: 0.5rem 0 1.25rem;

          button:hover {
            background-color: var(--mi-normal-foreground-color) !important;
            color: var(--mi-normal-background-color);
          }
        `}
      >
        {!ownedByUser && !isSubscribedToTier && !isSubscribedToArtist && (
          <>
            {" "}
            <div
              className={css`
                display: flex;
                align-items: center;
                align-items: stretch;
                justify-content: center;
              `}
            >
              <ArtistVariableSupport tier={subscriptionTier} />
            </div>
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
            <div
              className={css`
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
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
            </div>
          </Box>
        )}
      </div>
    </StyledSupportBox>
  );
};

export default ArtistSupportBox;
