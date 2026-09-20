import React from "react";
import { useTranslation } from "react-i18next";

import SubscriptionTierCardReleases from "./SubscriptionTierCardReleases";

export const hasTierPerks = (tier: ArtistSubscriptionTier) =>
  !!tier.autoPurchaseAlbums ||
  !!tier.digitalDiscountPercent ||
  !!tier.merchDiscountPercent;

export const hasTierReleases = (tier: ArtistSubscriptionTier) =>
  !!tier.releases && tier.releases.length > 0;

export const hasTierRewards = (tier: ArtistSubscriptionTier) =>
  hasTierPerks(tier) || hasTierReleases(tier);

const SubscriptionTierRewards: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
  artistName: string;
  className?: string;
  includeReleases?: boolean;
}> = ({ subscriptionTier, artistName, className, includeReleases = true }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const showReleases = includeReleases && hasTierReleases(subscriptionTier);

  if (!hasTierPerks(subscriptionTier) && !showReleases) {
    return null;
  }

  const { digitalDiscountPercent, merchDiscountPercent } = subscriptionTier;

  return (
    <ul className={"w-full flex gap-2 flex-col " + (className ?? "")}>
      {subscriptionTier.autoPurchaseAlbums && (
        <li>{t("includesNewReleases")}</li>
      )}
      {(!!digitalDiscountPercent || !!merchDiscountPercent) && (
        <li>
          {!!digitalDiscountPercent &&
            !merchDiscountPercent &&
            t("tierStoreDigitalDiscount", {
              discountPercent: digitalDiscountPercent,
              artistName,
            })}
          {!digitalDiscountPercent &&
            !!merchDiscountPercent &&
            t("tierStoreMerchDiscount", {
              discountPercent: merchDiscountPercent,
              artistName,
            })}
          {!!digitalDiscountPercent &&
            !!merchDiscountPercent &&
            digitalDiscountPercent !== merchDiscountPercent &&
            t("differentTierStoreDiscount", {
              digitalDiscountPercent,
              merchDiscountPercent,
              artistName,
            })}
          {!!digitalDiscountPercent &&
            !!merchDiscountPercent &&
            digitalDiscountPercent === merchDiscountPercent &&
            t("sameTierStoreDiscount", {
              discountPercent: digitalDiscountPercent,
              artistName,
            })}
        </li>
      )}
      {showReleases && (
        <li>
          <SubscriptionTierCardReleases tier={subscriptionTier} />
        </li>
      )}
    </ul>
  );
};

export default SubscriptionTierRewards;
