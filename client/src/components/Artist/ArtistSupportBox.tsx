import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import Money from "../common/Money";
import { useTranslation } from "react-i18next";
import MarkdownContent from "components/common/MarkdownContent";
import PlatformPercent from "components/common/PlatformPercent";
import LoadingBlocks from "./LoadingBlocks";
import ArtistVariableSupport from "./ArtistVariableSupport";
import { useAuthContext } from "state/AuthContext";
import { queryArtist } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  ArtistButton,
  ArtistButtonLink,
  useGetArtistColors,
} from "./ArtistButtons";
import useErrorHandler from "services/useErrorHandler";
import IncludedReleases from "./IncludedReleases";
import { getArtistManageTiersUrl } from "utils/artist";

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
  const secondaryColor = colors?.secondary ?? "var(--mi-secondary-color)";

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

  const primary = colors?.primary ?? "var(--mi-primary-color)";
  const tierBorderColor = `color-mix(in srgb, ${primary} ${isSubscribedToTier ? "100%" : "20%"}, transparent)`;
  const tierInnerBorderColor = `color-mix(in srgb, ${primary} 20%, transparent)`;

  const hasRewards =
    subscriptionTier.autoPurchaseAlbums ||
    (subscriptionTier.releases && subscriptionTier.releases.length > 0) ||
    !!subscriptionTier.digitalDiscountPercent ||
    !!subscriptionTier.merchDiscountPercent;

  return (
    <div
      className={
        (isSubscribedToTier ? " border-4" : " border-1") +
        " relative border-inset pb-5 mb-1 gap-5 bg-(--mi-darken-background-color) flex flex-col text-sm border-(--tier-border-color)"
      }
      style={
        {
          "--tier-border-color": tierBorderColor,
          "--tier-inner-border-color": tierInnerBorderColor,
          "--tier-secondary-color": secondaryColor,
        } as React.CSSProperties
      }
    >
      {isSubscribedToTier && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[44px] border-l-[44px] border-t-(--tier-border-color) border-l-transparent z-10">
          <span className="absolute -top-[40px] right-[6px] text-(--tier-secondary-color) text-base leading-none">
            ♥
          </span>
        </div>
      )}
      <div>
        <div className="absolute top-2 right-2 flex items-center justify-center gap-2">
          <PlatformPercent
            percent={subscriptionTier.platformPercent}
            chosenPrice={
              subscriptionTier?.minAmount ? subscriptionTier.minAmount / 100 : 0
            }
            artistName={artist?.name}
            currency={subscriptionTier.currency}
          />
          <ArtistButtonLink
            to={getArtistManageTiersUrl(subscriptionTier.artistId)}
            size="compact"
            variant="dashed"
          >
            Edit
          </ArtistButtonLink>
        </div>
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
        <div className="px-2 py-1 pt-4 pb-4 border-b-1 text-center border-b-(--tier-inner-border-color)">
          <h3 className="md:text-xl! text-base! font-bold!">
            {subscriptionTier.name}
          </h3>
          <Money
            amount={
              subscriptionTier.minAmount ? subscriptionTier.minAmount / 100 : 0
            }
            currency={subscriptionTier.currency}
          />{" "}
          / {t(subscriptionTier.interval === "MONTH" ? "monthly" : "yearly")}
        </div>
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
          <ArtistVariableSupport tier={subscriptionTier} />
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
      <div className="text-base px-5">
        <MarkdownContent content={subscriptionTier.description} />
      </div>
      {hasRewards && (
        <>
          <hr className="border-(--tier-inner-border-color)" />
          <ul className="w-full flex gap-2 flex-col px-5 text-sm">
            {subscriptionTier.autoPurchaseAlbums && (
              <li>{t("includesNewReleases")}</li>
            )}

            <li>
              {!!subscriptionTier.digitalDiscountPercent &&
                !subscriptionTier.merchDiscountPercent &&
                t("tierStoreDigitalDiscount", {
                  discountPercent: subscriptionTier.digitalDiscountPercent ?? 0,
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
                  discountPercent: subscriptionTier.digitalDiscountPercent ?? 0,
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
  );
};

export default ArtistSupportBox;
