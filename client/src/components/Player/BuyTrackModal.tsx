import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";
import { queryTrackGroup } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";

import Modal from "../common/Modal";

const compactModal = css`
  max-width: 400px !important;
`;

export const BuyTrackModal: React.FC<{
  showBuyModal: boolean;
  setShowBuyModal: (show: boolean) => void;
  trackGroupId: number;
}> = ({ showBuyModal, setShowBuyModal, trackGroupId }) => {
  const { data: trackGroup } = useQuery(
    queryTrackGroup({ albumSlug: `${trackGroupId}` })
  );
  const { t } = useTranslation("translation", { keyPrefix: "player" });
  const [showPurchaseForm, setShowPurchaseForm] = React.useState(false);

  const handleClose = () => {
    setShowBuyModal(false);
    setShowPurchaseForm(false);
  };

  return (
    <Modal
      open={showBuyModal}
      onClose={handleClose}
      size="small"
      className={showPurchaseForm ? undefined : compactModal}
    >
      {!showPurchaseForm ? (
        <div className="flex flex-col gap-4">
          <p>{t("trackLimitExplanation")}</p>
          <div className="flex gap-2 justify-end">
            <Button variant="dashed" onClick={handleClose}>
              {t("goBackToMirlo")}
            </Button>
            <Button onClick={() => setShowPurchaseForm(true)}>
              {t("buy")}
            </Button>
          </div>
        </div>
      ) : (
        trackGroup && <BuyTrackGroup trackGroup={trackGroup} noPadding />
      )}
    </Modal>
  );
};

export default BuyTrackModal;
