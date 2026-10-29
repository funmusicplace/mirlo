import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

import { ArtistButton } from "./ArtistButtons";

const SwitchTierModal: React.FC<{
  open: boolean;
  onClose: () => void;
  tier: ArtistSubscriptionTier;
  currentSubscription: ArtistUserSubscription;
  currency?: string;
  onSwitched: () => void;
  startCheckout: () => void;
}> = ({
  open,
  onClose,
  tier,
  currentSubscription,
  currency,
  onSwitched,
  startCheckout,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const needsCheckout =
    !!tier.collectAddress && !currentSubscription.shippingAddress;
  const billedNow =
    tier.interval !== currentSubscription.artistSubscriptionTier.interval;
  const amount = moneyDisplay({
    amount: (tier.defaultAmount ?? tier.minAmount ?? 0) / 100,
    currency,
  });

  const confirm = async () => {
    if (needsCheckout) {
      onClose();
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
      onClose();
      onSwitched();
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title={t("switchTierTitle", { tierName: tier.name })}
    >
      <div className="flex flex-col gap-3">
        <p>
          {t(
            tier.interval === "YEAR"
              ? "switchTierPriceYearly"
              : "switchTierPriceMonthly",
            { amount }
          )}
        </p>
        <p>{t(billedNow ? "switchTierBilledNow" : "switchTierNextBill")}</p>
        {needsCheckout && <p>{t("switchTierNeedsCheckout")}</p>}
        <ArtistButton onClick={confirm} isLoading={isSwitching}>
          {t("switchTier")}
        </ArtistButton>
        <ArtistButton variant="outlined" onClick={onClose}>
          {t("nevermind")}
        </ArtistButton>
      </div>
    </Modal>
  );
};

export default SwitchTierModal;
