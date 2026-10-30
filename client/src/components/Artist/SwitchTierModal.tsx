import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";

import SwitchTierConfirmation from "./SwitchTierConfirmation";

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

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title={t("switchTierTitle", { tierName: tier.name })}
    >
      <SwitchTierConfirmation
        tier={tier}
        currentSubscription={currentSubscription}
        currency={currency}
        onCancel={onClose}
        onSwitched={() => {
          onClose();
          onSwitched();
        }}
        startCheckout={() => {
          onClose();
          startCheckout();
        }}
      />
    </Modal>
  );
};

export default SwitchTierModal;
