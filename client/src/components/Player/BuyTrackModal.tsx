import React from "react";

import Modal from "../common/Modal";
import { useTranslation } from "react-i18next";
import { queryTrackGroup } from "queries";
import { useQuery } from "@tanstack/react-query";
import BuyTrackGroup from "components/TrackGroup/BuyTrackGroup";
import { css } from "@emotion/css";

export const BuyTrackModal: React.FC<{
  showBuyModal: boolean;
  setShowBuyModal: (show: boolean) => void;
  trackGroupId: number;
  trackId: number;
}> = ({ showBuyModal, setShowBuyModal, trackGroupId, trackId }) => {
  const { data: trackGroup } = useQuery(
    queryTrackGroup({ albumSlug: `${trackGroupId}` })
  );
  const { t } = useTranslation("translation", { keyPrefix: "player" });
  return (
    <Modal
      open={showBuyModal}
      onClose={() => setShowBuyModal(false)}
      size="small"
    >
      {t("trackLimitExplanation")}
      <hr
        className={css`
          margin: 1rem 0;
          border-color: var(--mi-darken-x-background-color);
        `}
      />
      {trackGroup && (
        <BuyTrackGroup
          trackGroup={trackGroup}
          noPadding
          // track={trackGroup.tracks?.find((t) => t.id === trackId)}
        />
      )}
    </Modal>
  );
};

export default BuyTrackModal;
