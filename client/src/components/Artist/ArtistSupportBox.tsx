import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import Box from "../common/Box";
import Money from "../common/Money";
import { useTranslation } from "react-i18next";
import MarkdownContent from "components/common/MarkdownContent";
import { bp } from "../../constants";
import PlatformPercent from "components/common/PlatformPercent";
import LoadingBlocks from "./LoadingBlocks";
import styled from "@emotion/styled";
import ArtistVariableSupport, {
  SupportBoxButton,
} from "./ArtistVariableSupport";
import { useAuthContext } from "state/AuthContext";
import { queryArtist } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useGetArtistColors } from "./ArtistButtons";
import useErrorHandler from "services/useErrorHandler";

const StyledSupportBox = styled(Box)`
  background-color: var(--mi-darken-background-color);
  margin-bottom: 1rem;
  padding: 0 !important;
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
  const { user, refreshLoggedInUser } = useAuthContext();
  const { artistId } = useParams();
  const { data: artist, refetch: refresh } = useQuery(
    queryArtist({ artistSlug: artistId })
  );

  const { colors } = useGetArtistColors();

  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);

  const errorHandler = useErrorHandler();

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
      errorHandler(e);
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
      errorHandler(e);
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

  return (
    <StyledSupportBox>
      {subscriptionTier.images?.[0]?.image.sizes?.[625] && (
        <img
          src={
            subscriptionTier.images[0].image.sizes[625] +
            `?updatedAt=${Date.now()}`
          }
          width="100%"
          height="180px"
          className={css`
            object-fit: cover;
          `}
        />
      )}
      <div
        className={css`
          padding: 1.5rem 0.25rem;
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
        <h3>{subscriptionTier.name}</h3>
        <Money
          amount={
            subscriptionTier.minAmount ? subscriptionTier.minAmount / 100 : 0
          }
          currency={subscriptionTier.currency}
        />{" "}
        / {t(subscriptionTier.interval === "MONTH" ? "monthly" : "yearly")}
      </div>
      <div
        className={css`
          padding: 1rem 1.5rem 0;
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
          padding: 0 1.5rem;
          margin: 0.5rem 0 1.25rem;

          button:hover {
            background-color: var(--mi-normal-foreground-color) !important;
            color: var(--mi-normal-background-color);
          }
        `}
      >
        {!isSubscribedToTier && !isSubscribedToArtist && (
          <div className={css``}>
            <div
              className={css`
                display: flex;
                align-items: center;
                align-items: stretch;
                justify-content: center;
                margin-bottom: 0.5rem;
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
              artistName={artist?.name}
              currency={subscriptionTier.currency}
            />
          </div>
        )}
        {(isSubscribedToTier || isSubscribedToArtist) && (
          <Box
            className={css`
              padding: 0 1.5rem;
              text-align: center;
              background-color: var(--mi-darken-background-color);
              margin-bottom: 0;
            `}
          >
            <p>
              {isSubscribedToArtist &&
                !isSubscribedToTier &&
                t("areSupporting", { artistName: artist.name })}
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
      {subscriptionTier.autoPurchaseAlbums && (
        <div
          className={css`
            padding: 1.5rem;
            width: 100%;
            background-color: ${colors?.background};
            border-top: 1px solid ${colors?.foreground};
            padding: 0.5rem 0.75rem;
            text-align: center;
          `}
        >
          {t("includesNewReleases")}
        </div>
      )}
    </StyledSupportBox>
  );
};

export default ArtistSupportBox;
