import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import MarkdownContent from "components/common/MarkdownContent";
import PlatformPercent from "components/common/PlatformPercent";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { getArtistManageTiersUrl, getArtistTierUrl } from "utils/artist";

import Money from "../common/Money";

import ArtistRouterLink, { ArtistButtonLink } from "./ArtistButtons";
import LoadingBlocks from "./LoadingBlocks";
import SubscriptionTierActions, {
  isUserSubscribedToTier,
} from "./SubscriptionTierActions";
import SubscriptionTierRewards, {
  hasTierRewards,
} from "./SubscriptionTierRewards";

const ArtistSupportBox: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
  showDetailsLink?: boolean;
}> = ({ subscriptionTier, showDetailsLink = true }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const { artistId } = useParams();
  const { data: artist } = useQuery(queryArtist({ artistSlug: artistId }));

  const secondaryColor = "var(--mi-button-text-color)";

  if (!artist) {
    return <LoadingBlocks rows={2} />;
  }

  if (
    (!subscriptionTier.minAmount || subscriptionTier.minAmount === 0) &&
    !subscriptionTier.allowVariable
  ) {
    return null;
  }

  const isSubscribedToTier = isUserSubscribedToTier(user, subscriptionTier);

  const link = "var(--mi-button-color)";
  const tierBorderColor = `color-mix(in srgb, ${link} ${isSubscribedToTier ? "100%" : "20%"}, transparent)`;
  const tierInnerBorderColor = `color-mix(in srgb, ${link} 20%, transparent)`;

  return (
    <div
      className={
        (isSubscribedToTier ? " border-4" : " border-1") +
        " relative border-inset pb-5 mb-1 gap-5 bg-(--mi-button-tint-color) flex flex-col text-sm border-(--tier-border-color)"
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
        <div className="absolute top-2 right-2 flex items-center justify-center gap-2 z-21 ">
          {user && user.id === artist.userId && (
            <ArtistButtonLink
              to={
                getArtistManageTiersUrl(subscriptionTier.artistId) +
                "/" +
                subscriptionTier.id
              }
              size="compact"
              variant="dashed"
              className={css`
                && {
                  background-color: var(--mi-button-tint-x-color) !important;
                }
              `}
            >
              {t("editTier")}
            </ArtistButtonLink>
          )}
          <PlatformPercent
            percent={subscriptionTier.platformPercent}
            chosenPrice={
              subscriptionTier?.minAmount ? subscriptionTier.minAmount / 100 : 0
            }
            artistName={artist?.name}
            currency={artist?.user?.currency ?? "usd"}
            alignRight
          />
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
        <div className="px-5 py-5 border-b-1 text-center border-b-(--tier-inner-border-color)">
          <h3 className="md:text-xl! text-base! font-bold!">
            {subscriptionTier.name}
          </h3>
          <Money
            amount={
              subscriptionTier.minAmount ? subscriptionTier.minAmount / 100 : 0
            }
            currency={artist?.user?.currency ?? "usd"}
          />{" "}
          / {t(subscriptionTier.interval === "MONTH" ? "monthly" : "yearly")}
        </div>
      </div>
      <div
        className={
          "px-5 " +
          css`
            button:hover {
              background-color: var(--mi-text-color) !important;
              color: var(--mi-background-color);
            }
          `
        }
      >
        <SubscriptionTierActions subscriptionTier={subscriptionTier} />
      </div>
      {subscriptionTier.description && (
        <div className="text-base px-5">
          <MarkdownContent content={subscriptionTier.description} />
        </div>
      )}
      {hasTierRewards(subscriptionTier) && (
        <>
          <hr className="border-(--tier-inner-border-color)" />
          <SubscriptionTierRewards
            subscriptionTier={subscriptionTier}
            artistName={artist.name}
            className="px-5 text-sm"
          />
        </>
      )}
      {showDetailsLink && (
        <div className="px-5 text-center mt-auto">
          <ArtistRouterLink to={getArtistTierUrl(artist, subscriptionTier)}>
            {t("learnMoreAboutTier")}
          </ArtistRouterLink>
        </div>
      )}
    </div>
  );
};

export default ArtistSupportBox;
