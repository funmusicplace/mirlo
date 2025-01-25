import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import React from "react";
import { FaPen } from "react-icons/fa";
import api from "services/api";
import Box from "../common/Box";
import Button from "../common/Button";
import { useAuthContext } from "state/AuthContext";

const ArtistManageSubscription: React.FC<{
  userSubscription?: ArtistUserSubscription;
  userSubscriptionTier: ArtistSubscriptionTier;
  reload: () => Promise<void>;
}> = ({ userSubscriptionTier, reload, userSubscription }) => {
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const { user } = useAuthContext();
  const userId = user?.id;

  const cancelSubscription = React.useCallback(async () => {
    try {
      if (userSubscription) {
        await api.delete(`manage/subscriptions/${userSubscription.id}`);
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
      <Button startIcon={<FaPen />} onClick={() => setIsEditOpen(true)} />

      <Modal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Manage subscription"
        size="small"
      >
        <Button
          size="compact"
          buttonRole="warning"
          onClick={cancelSubscription}
        >
          Cancel subscription
        </Button>
      </Modal>
    </Box>
  );
};

export default ArtistManageSubscription;
