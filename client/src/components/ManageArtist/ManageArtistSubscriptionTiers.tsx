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

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();

  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();
  const [manageTier, setManageTier] = React.useState<ArtistSubscriptionTier>();
  const [tiers, setTiers] = React.useState<ArtistSubscriptionTier[]>([]);

  const userId = user?.id;

  const loadSubscriptions = React.useCallback(async () => {
    if (userId) {
      const { result } = await api.get<Artist>(
        `users/${userId}/artists/${artistId}`
      );
      setArtist(result);
      const fetchedSubscriptions = await api.getMany<ArtistSubscriptionTier>(
        `users/${userId}/artists/${artistId}/subscriptions`
      );
      setTiers(fetchedSubscriptions.results);
    }
  }, [artistId, userId]);

  const deleteTier = React.useCallback(
    async (tierId: number) => {
      try {
        await api.delete(
          `users/${userId}/artists/${artistId}/subscriptions/${tierId}`
        );
        snackbar("Tier deleted", { type: "success" });
        loadSubscriptions();
      } catch (e) {
        console.error(e);
      }
    },
    [artistId, loadSubscriptions, snackbar, userId]
  );

  React.useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        margin-bottom: 2rem;
        margin-top: 2rem;
      `}
    >
      <h2>Your subscription tiers</h2>
      <div
        className={css`
          margin-bottom: 1rem;
        `}
      >
        {tiers?.map((tier) => (
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
                  {tier.name}: <Money amount={tier.minAmount} />
                </>
              </strong>
              <div>
                <Button
                  compact
                  startIcon={<FaPen />}
                  onClick={() => setManageTier(tier)}
                >
                  Edit
                </Button>
                <Button
                  className={css`
                    margin-left: 0.5rem;
                  `}
                  compact
                  startIcon={<FaTrash />}
                  onClick={() => deleteTier(tier.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
            <div>{tier.description}</div>
          </Box>
        ))}
      </div>
      {manageTier && (
        <Modal
          open={!!manageTier}
          onClose={() => setManageTier(undefined)}
          size="small"
        >
          {/* There is some overly complex state management going on here with the reloads being passed around */}
          <SubscriptionForm
            existing={manageTier}
            reload={() => loadSubscriptions()}
            artist={artist}
          />
        </Modal>
      )}

      <SubscriptionForm artist={artist} reload={loadSubscriptions} />
    </div>
  );
};

export default ManageArtistSubscriptionTiers;
