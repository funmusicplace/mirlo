import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import Box from "../common/Box";
import Button from "../common/Button";

import SubscriptionCancelledNotice, {
  isSubscriptionCancelled,
} from "./SubscriptionCancelledNotice";

const ArtistManageSubscription: React.FC<{
  userSubscription?: ArtistUserSubscription;
  userSubscriptionTier: ArtistSubscriptionTier;
  reload: () => Promise<void>;
}> = ({ userSubscriptionTier, reload, userSubscription }) => {
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { refreshLoggedInUser } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();

  const isCancelled = isSubscriptionCancelled(userSubscription);

  const cancelSubscription = React.useCallback(
    async (keepFollowing: boolean) => {
      try {
        setIsCancelling(true);
        await api.delete(`artists/${userSubscriptionTier.artistId}/subscribe`, {
          keepFollowing,
        });
        snackbar(t("subscriptionCancelled"), { type: "success" });
        setIsConfirmingCancel(false);
        setIsEditOpen(false);
        refreshLoggedInUser();
        await reload();
      } catch (e) {
        errorHandler(e);
      } finally {
        setIsCancelling(false);
      }
    },
    [
      reload,
      refreshLoggedInUser,
      snackbar,
      t,
      errorHandler,
      userSubscriptionTier.artistId,
    ]
  );

  return (
    <Box
      className={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
      `}
    >
      <div>
        <p>
          <Trans
            t={t}
            i18nKey="supportingArtistAtTier"
            values={{ tierName: userSubscriptionTier.name }}
            components={{ strong: <strong /> }}
          />
        </p>
        <SubscriptionCancelledNotice subscription={userSubscription} />
      </div>
      {!isCancelled && (
        <Button startIcon={<FaPen />} onClick={() => setIsEditOpen(true)} />
      )}

      <Modal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setIsConfirmingCancel(false);
        }}
        title={t("manageSubscription")}
        size="small"
      >
        {!isConfirmingCancel && (
          <Button
            size="compact"
            buttonRole="warning"
            onClick={() => setIsConfirmingCancel(true)}
          >
            {t("cancelSubscription")}
          </Button>
        )}
        {isConfirmingCancel && (
          <div
            className={css`
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            `}
          >
            <p>{t("cancelSubscriptionConfirm")}</p>
            <Button
              size="compact"
              buttonRole="warning"
              isLoading={isCancelling}
              onClick={() => cancelSubscription(false)}
            >
              {t("unsubscribeEntirely")}
            </Button>
            <Button
              size="compact"
              isLoading={isCancelling}
              onClick={() => cancelSubscription(true)}
            >
              {t("stopPaymentsKeepFollowing")}
            </Button>
            <Button
              size="compact"
              onClick={() => setIsConfirmingCancel(false)}
              disabled={isCancelling}
            >
              {t("nevermind")}
            </Button>
          </div>
        )}
      </Modal>
    </Box>
  );
};

export default ArtistManageSubscription;
