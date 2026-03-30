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
import ArtistVariableSupport from "./ArtistVariableSupport";
import { useAuthContext } from "state/AuthContext";
import { queryArtist } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ArtistButton } from "./ArtistButtons";
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
        className={
          "py-0 px-5 " +
          css`
            margin: 0.5rem 0 1.25rem;

            button:hover {
              background-color: var(--mi-normal-foreground-color) !important;
              color: var(--mi-normal-background-color);
            }
          `
        }
      >
        {!isSubscribedToTier && !isSubscribedToArtist && (
          <div className="flex gap-3 flex-col">
            <div className="flex items-center content-center">
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
          <Box className="px-3 py-0 text-center bg-(--mi-darken-background-color) mb-0">
            <p>
              {isSubscribedToArtist &&
                !isSubscribedToTier &&
                t("areSupporting", { artistName: artist.name })}
              {isSubscribedToTier && t("supportAtThisTier")}
            </p>
            <div className="flex items-center justify-center">
              {user && isSubscribedToArtist && !isSubscribedToTier && (
                <ArtistButton
                  onClick={() => subscribeToTier(subscriptionTier)}
                  isLoading={isCheckingForSubscription}
                >
                  {t("chooseThisSubscription")}
                </ArtistButton>
              )}
              {user && isSubscribedToTier && (
                <ArtistButton onClick={() => cancelSubscription()}>
                  {t("cancelSubscription")}
                </ArtistButton>
              )}
            </div>
          </Box>
        )}
      </div>
      <div
        className="w-full flex gap-2 flex-col my-2 p-5 text-sm"
        style={{ borderTop: "var(--mi-border)" }}
      >
        {subscriptionTier.autoPurchaseAlbums && (
          <p>{t("includesNewReleases")}</p>
        )}
        {subscriptionTier.releases && subscriptionTier.releases.length > 0 && (
          <p>
            {t("includesReleases", { count: subscriptionTier.releases.length })}
          </p>
        )}
        <p>
          {subscriptionTier.digitalDiscountPercent &&
            !subscriptionTier.merchDiscountPercent &&
            t("tierStoreDigitalDiscount", {
              discountPercent: subscriptionTier.digitalDiscountPercent ?? 0,
              artistName: artist.name,
            })}
          {!subscriptionTier.digitalDiscountPercent &&
            subscriptionTier.merchDiscountPercent &&
            t("tierStoreMerchDiscount", {
              discountPercent: subscriptionTier.merchDiscountPercent ?? 0,
              artistName: artist.name,
            })}
          {subscriptionTier.digitalDiscountPercent &&
            subscriptionTier.merchDiscountPercent &&
            subscriptionTier.digitalDiscountPercent !==
              subscriptionTier.merchDiscountPercent &&
            t("differentTierStoreDiscount", {
              digitalDiscountPercent:
                subscriptionTier.digitalDiscountPercent ?? 0,
              merchDiscountPercent: subscriptionTier.merchDiscountPercent ?? 0,
              artistName: artist.name,
            })}
          {subscriptionTier.digitalDiscountPercent &&
            subscriptionTier.merchDiscountPercent &&
            subscriptionTier.digitalDiscountPercent ===
              subscriptionTier.merchDiscountPercent &&
            t("sameTierStoreDiscount", {
              digitalDiscountPercent:
                subscriptionTier.digitalDiscountPercent ?? 0,
              merchDiscountPercent: subscriptionTier.merchDiscountPercent ?? 0,
              artistName: artist.name,
            })}
        </p>
      </div>
    </StyledSupportBox>
  );
};

export default ArtistSupportBox;
