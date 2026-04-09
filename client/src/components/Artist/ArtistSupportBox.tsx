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
import { ArtistButton, useGetArtistColors } from "./ArtistButtons";
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

  const hasRewards =
    subscriptionTier.autoPurchaseAlbums ||
    (subscriptionTier.releases && subscriptionTier.releases.length > 0) ||
    !!subscriptionTier.digitalDiscountPercent ||
    !!subscriptionTier.merchDiscountPercent;

  return (
    <div className="snap-center">
      <div
        className={
          className +
          (isSubscribedToTier
            ? css`
                border-width: 4px;
                border-color: ${colors?.primary ?? "var(--mi-primary-color)"};
              `
            : "border-(--mi-darken-xx-background-color) border-1") +
          " relative border-inset pb-5 mb-1 gap-5 bg-(--mi-darken-background-color) flex flex-col text-sm"
        }
      >
        {isSubscribedToTier && (
          <div
            className={`absolute top-0 right-0 w-0 h-0 border-t-[44px] border-l-[44px] border-t-[${colors?.primary ?? "var(--mi-primary-color)"}] border-l-transparent z-10`}
          >
            <span
              className={`absolute -top-[40px] right-[6px] text-[${colors?.secondary ?? "var(--mi-secondary-color)"}] text-base leading-none`}
            >
              ♥
            </span>
          </div>
        )}
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
            <div className="flex items-center justify-center gap-3 flex-col">
              {user && isSubscribedToArtist && !isSubscribedToTier && (
                <ArtistButton
                  onClick={() => subscribeToTier(subscriptionTier)}
                  isLoading={isCheckingForSubscription}
                >
                  {t("chooseThisSubscription")}
                </ArtistButton>
              )}
              {user && isSubscribedToTier && (
                <ArtistButton
                  onClick={() => cancelSubscription()}
                  variant="outlined"
                >
                  {t("cancelSubscription")}
                </ArtistButton>
              )}
              <p>
                {isSubscribedToTier &&
                  t("thankYouForSupporting", { artistName: artist.name })}
              </p>
            </div>
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
                    discountPercent:
                      subscriptionTier.digitalDiscountPercent ?? 0,
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
