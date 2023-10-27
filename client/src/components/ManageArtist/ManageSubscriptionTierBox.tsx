import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { Money } from "components/common/Money";
import React from "react";
import { FaPen, FaTrash } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import SubscriptionForm from "./SubscriptionForm";
import { useTranslation } from "react-i18next";

const ManageSubscriptionTierBox: React.FC<{
  tier: ArtistSubscriptionTier;
  artist: Artist;
  reload: () => Promise<void>;
}> = ({ tier, reload, artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();

  const { artistId } = useParams();
  const [manageTier, setManageTier] = React.useState<ArtistSubscriptionTier>();
  const {t} = useTranslation("translation", { keyPrefix: "manageSubscriptionTierBox"})

  const userId = user?.id;

  const deleteTier = React.useCallback(
    async (tierId: number) => {
      try {
        await api.delete(
          `users/${userId}/artists/${artistId}/subscriptionTiers/${tierId}`
        );
        snackbar("Tier deleted", { type: "success" });
        reload();
      } catch (e) {
        console.error(e);
      }
    },
    [artistId, reload, snackbar, userId]
  );

  return (
    <Box
      key={tier.id}
      className={css`
        margin-bottom: 0.5rem;
      `}
    >
      <div
        className={css`
          display: flex;
          justify-content: space-between;
        `}
      >
        <strong>
          <>
            {tier.name}:{" "}
            <Money amount={tier.minAmount ? tier.minAmount / 100 : 0} />
          </>
        </strong>
        <div>
          <Button
            compact
            startIcon={<FaPen />}
            onClick={() => setManageTier(tier)}
          >
            {t("edit")}
          </Button>
          <Button
            className={css`
              margin-left: 0.5rem;
            `}
            compact
            startIcon={<FaTrash />}
            onClick={() => deleteTier(tier.id)}
          >
            {t("delete")}
          </Button>
        </div>
      </div>
      <div>{tier.description}</div>
      {manageTier && (
        <Modal
          open={!!manageTier}
          onClose={() => setManageTier(undefined)}
          size="small"
        >
          {/* There is some overly complex state management going on here with the reloads being passed around */}
          <SubscriptionForm
            existing={manageTier}
            reload={() => reload()}
            artist={artist}
          />
        </Modal>
      )}
    </Box>
  );
};

export default ManageSubscriptionTierBox;
