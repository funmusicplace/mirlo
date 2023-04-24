import { css } from "@emotion/css";
import IconButton from "components/common/IconButton";
import Modal from "components/common/Modal";
import React from "react";
import { FaPen } from "react-icons/fa";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "../common/Box";
import Button from "../common/Button";

const ArtistManageSubscription: React.FC<{
  userSubscription?: ArtistUserSubscription;
  userSubscriptionTier: ArtistSubscriptionTier;
  reload: () => Promise<void>;
}> = ({ userSubscriptionTier, reload, userSubscription }) => {
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;

  const cancelSubscription = React.useCallback(async () => {
    try {
      if (userSubscription) {
        await api.delete(
          `users/${userId}/subscriptions/${userSubscription.id}`
        );
        await reload();
      }
    } catch (e) {
      console.error(e);
    }
  }, [reload, userId, userSubscription]);

  return (
    <Box
      className={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
      `}
    >
      <p>
        You are supporting this artist at the{" "}
        <strong>{userSubscriptionTier.name}</strong> tier!
      </p>
      <IconButton onClick={() => setIsEditOpen(true)}>
        <FaPen />
      </IconButton>
      <Modal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Manage subscription"
        size="small"
      >
        <Button compact color="warning" onClick={cancelSubscription}>
          Cancel subscription
        </Button>
      </Modal>
    </Box>
  );
};

export default ArtistManageSubscription;
