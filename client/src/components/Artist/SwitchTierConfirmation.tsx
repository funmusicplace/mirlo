import { moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

import { ArtistButton } from "./ArtistButtons";

const SwitchTierConfirmation: React.FC<{
  tier: ArtistSubscriptionTier;
  currentSubscription: ArtistUserSubscription;
  currency?: string;
  onCancel: () => void;
  onSwitched: () => void;
  startCheckout: () => void;
}> = ({
  tier,
  currentSubscription,
  currency,
  onCancel,
  onSwitched,
  startCheckout,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const needsPayment = !currentSubscription.isPaid;
  const needsAddress =
    !!tier.collectAddress && !currentSubscription.shippingAddress;
  const price = tier.minAmount ?? tier.defaultAmount ?? 0;
  const changesInterval =
    tier.interval !== currentSubscription.artistSubscriptionTier.interval;
  const isUpgrade = price > currentSubscription.amount;
  const billedNow = changesInterval || isUpgrade;
  const amount = moneyDisplay({ amount: price / 100, currency });

  const confirm = async () => {
    if (needsPayment || needsAddress) {
      startCheckout();
      return;
    }
    try {
      setIsSwitching(true);
      await api.put<{ tierId: number }, unknown>(
        `manage/subscriptions/${currentSubscription.id}/tier`,
        { tierId: tier.id }
      );
      snackbar(
        t(
          billedNow
            ? "subscriptionTierChangedBilledNow"
            : "subscriptionTierChanged",
          { tierName: tier.name }
        ),
        { type: "success" }
      );
      onSwitched();
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p>
        {t(
          tier.interval === "YEAR"
            ? "switchTierPriceYearly"
            : "switchTierPriceMonthly",
          { amount }
        )}
      </p>
      {needsPayment ? (
        <p>{t("switchTierNeedsPayment")}</p>
      ) : (
        <>
          <p>
            {t(
              changesInterval
                ? "switchTierBilledNow"
                : isUpgrade
                  ? "switchTierUpgradeBilledNow"
                  : "switchTierNextBill"
            )}
          </p>
          {needsAddress && <p>{t("switchTierNeedsCheckout")}</p>}
        </>
      )}
      <ArtistButton onClick={confirm} isLoading={isSwitching}>
        {t("switchTier")}
      </ArtistButton>
      <ArtistButton variant="outlined" onClick={onCancel}>
        {t("nevermind")}
      </ArtistButton>
    </div>
  );
};

export default SwitchTierConfirmation;
