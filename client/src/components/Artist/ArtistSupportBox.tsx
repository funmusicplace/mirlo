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
import IncludedReleases from "./IncludedReleases";

const ArtistSupportBox: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
  className?: string;
}> = ({ subscriptionTier, className }) => {
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

  const hasRewards =
    subscriptionTier.autoPurchaseAlbums ||
    (subscriptionTier.releases && subscriptionTier.releases.length > 0) ||
    !!subscriptionTier.digitalDiscountPercent ||
    !!subscriptionTier.merchDiscountPercent;

  return (
    <div>
      <div
        className={
          className +
          " border-1 border-(--mi-darken-xx-background-color) pb-5 mb-1 gap-5 bg-(--mi-darken-background-color) flex flex-col text-sm"
        }
      >
        {subscriptionTier.images?.[0]?.image.sizes?.[625] && (
          <img
            src={
              subscriptionTier.images[0].image.sizes[625] +
              `?updatedAt=${Date.now()}`
            }
            width="100%"
            height="180px"
            className="cover w-full"
          />
        )}
        <div className="px-2 py-1 border-b-1 border-b-(--mi-darken-x-background-color) text-center">
          <h3 className="md:text-lg! text-base!">{subscriptionTier.name}</h3>
          <Money
            amount={
              subscriptionTier.minAmount ? subscriptionTier.minAmount / 100 : 0
            }
            currency={subscriptionTier.currency}
          />{" "}
          / {t(subscriptionTier.interval === "MONTH" ? "monthly" : "yearly")}
        </div>
        <div className="text-base px-5">
          <MarkdownContent content={subscriptionTier.description} />
        </div>
        <div
          className={
            "px-5 " +
            css`
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
        {hasRewards && (
          <>
            <hr className="border-(--mi-darken-xx-background-color)" />
            <ul className="w-full flex gap-2 flex-col px-5 text-sm">
              {subscriptionTier.autoPurchaseAlbums && (
                <li>{t("includesNewReleases")}</li>
              )}

              <li>
                {!!subscriptionTier.digitalDiscountPercent &&
                  !subscriptionTier.merchDiscountPercent &&
                  t("tierStoreDigitalDiscount", {
                    discountPercent:
                      subscriptionTier.digitalDiscountPercent ?? 0,
                    artistName: artist.name,
                  })}
                {!subscriptionTier.digitalDiscountPercent &&
                  !!subscriptionTier.merchDiscountPercent &&
                  t("tierStoreMerchDiscount", {
                    discountPercent: subscriptionTier.merchDiscountPercent ?? 0,
                    artistName: artist.name,
                  })}
                {!!subscriptionTier.digitalDiscountPercent &&
                  !!subscriptionTier.merchDiscountPercent &&
                  subscriptionTier.digitalDiscountPercent !==
                    subscriptionTier.merchDiscountPercent &&
                  t("differentTierStoreDiscount", {
                    digitalDiscountPercent:
                      subscriptionTier.digitalDiscountPercent ?? 0,
                    merchDiscountPercent:
                      subscriptionTier.merchDiscountPercent ?? 0,
                    artistName: artist.name,
                  })}
                {!!subscriptionTier.digitalDiscountPercent &&
                  !!subscriptionTier.merchDiscountPercent &&
                  subscriptionTier.digitalDiscountPercent ===
                    subscriptionTier.merchDiscountPercent &&
                  t("sameTierStoreDiscount", {
                    digitalDiscountPercent:
                      subscriptionTier.digitalDiscountPercent ?? 0,
                    merchDiscountPercent:
                      subscriptionTier.merchDiscountPercent ?? 0,
                    artistName: artist.name,
                  })}
              </li>
              {subscriptionTier.releases &&
                subscriptionTier.releases.length > 0 && (
                  <li>
                    <IncludedReleases tier={subscriptionTier} />
                  </li>
                )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default ArtistSupportBox;
