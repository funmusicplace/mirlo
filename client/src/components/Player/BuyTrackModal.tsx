import React from "react";

import Modal from "../common/Modal";
import { useTranslation } from "react-i18next";

export const BuyTrackModal: React.FC<{
  showBuyModal: boolean;
  setShowBuyModal: (show: boolean) => void;
}> = ({ showBuyModal, setShowBuyModal }) => {
  const { t } = useTranslation("translation", { keyPrefix: "player" });
  return (
    <Modal open={showBuyModal} onClose={() => setShowBuyModal(false)}>
      {t("trackLimitExplanation")}
    </Modal>
  );
};

export default BuyTrackModal;
