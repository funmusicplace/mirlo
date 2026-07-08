import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";

export const isSubscriptionCancelled = (
  subscription?: Pick<ArtistUserSubscription, "deleteReason">
) => subscription?.deleteReason === "USER_CANCELLED";

// Shown once a user cancels: their access continues until nextBillingDate
// (the paid period they've already covered). Renders nothing unless the
// subscription is actually in the cancelled state.
const SubscriptionCancelledNotice: React.FC<{
  subscription?: ArtistUserSubscription;
  className?: string;
}> = ({ subscription, className }) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "artist" });

  if (!isSubscriptionCancelled(subscription)) {
    return null;
  }

  return (
    <p className={className}>
      {t("subscriptionCancelledActiveUntil", {
        date: subscription?.nextBillingDate
          ? formatDate({
              date: subscription.nextBillingDate,
              options: { day: "numeric", month: "long", year: "numeric" },
              i18n,
            })
          : "",
      })}
    </p>
  );
};

export default SubscriptionCancelledNotice;
