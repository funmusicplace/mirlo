import React from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { useTranslation } from "react-i18next";
import { getArtistUrl } from "utils/artist";

const FailedSubscriptionBanner: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "common" });

  const hasFailedSubscription = user?.artistUserSubscriptions?.filter(
    (sub) =>
      sub.artistUserSubscriptionCharges?.[0]?.transaction?.paymentStatus ===
      "FAILED"
  );

  if (!hasFailedSubscription || hasFailedSubscription.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="w-full text-center text-sm px-4 py-2 bg-(--mi-warning-background-color) text-(--mi-warning-text-color)"
    >
      {t("subscriptionPaymentFailedBanner")}
      {hasFailedSubscription?.map((sub) => (
        <div key={sub.id}>
          <Link to={getArtistUrl(sub.artistSubscriptionTier.artist)}>
            {sub.artistSubscriptionTier.artist.name}
          </Link>
        </div>
      ))}
    </div>
  );
};

export default FailedSubscriptionBanner;
