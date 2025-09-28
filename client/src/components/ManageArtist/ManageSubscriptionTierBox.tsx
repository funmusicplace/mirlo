import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { Money } from "components/common/Money";
import React from "react";
import { FaPen, FaTrash } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import SubscriptionForm from "./SubscriptionForm";
import MarkdownContent from "components/common/MarkdownContent";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { useAuthContext } from "state/AuthContext";
import { useTranslation } from "react-i18next";

const ManageSubscriptionTierBox: React.FC<{
  tier: ArtistSubscriptionTier;
  artist: Artist;
  reload: () => Promise<unknown>;
}> = ({ tier, reload, artist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();

  const { artistId } = useParams();
  const [manageTier, setManageTier] = React.useState<boolean>();

  const userId = user?.id;

  const deleteTier = React.useCallback(
    async (tierId: number) => {
      try {
        await api.delete(
          `manage/artists/${artistId}/subscriptionTiers/${tierId}`
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
        background: var(--mi-darken-background-color);
      `}
      noPadding
    >
      {tier.images?.[0]?.image.sizes?.[625] && (
        <img
          src={tier.images[0].image.sizes[625] + `?updatedAt=${Date.now()}`}
          width="100%"
          height="120px"
          className={css`
            object-fit: cover;
          `}
        />
      )}
      <div
        className={css`
          padding: 0.25rem 1rem;
        `}
      >
        <SpaceBetweenDiv
          className={css`
            flex-direction: column;
          `}
        >
          <div
            className={css`
              margin-top: 0.5rem;
              margin-bottom: 0.5rem;
              width: 100%;
              display: flex;
              justify-content: space-between;
              padding-bottom: 1rem;
              align-items: center;
              border-bottom: var(--mi-border);
              strong {
                text-transform: uppercase;
              }
            `}
          >
            <div
              className={css`
                width: 70%;
              `}
            >
              <strong>
                {tier.name}:{" "}
                <Money
                  amount={tier.minAmount ? tier.minAmount / 100 : 0}
                  currency={tier.currency}
                />{" "}
                {t(tier.interval === "MONTH" ? "monthly" : "yearly")}
              </strong>
            </div>
            <div
              className={css`
                display: flex;
              `}
            >
              <Button
                variant="dashed"
                startIcon={<FaPen />}
                onClick={() => setManageTier(true)}
              />

              <Button
                className={css`
                  margin-left: 0.5rem;
                `}
                startIcon={<FaTrash />}
                onClick={() => deleteTier(tier.id)}
              />
            </div>
          </div>
        </SpaceBetweenDiv>

        <MarkdownContent content={tier.description} />
        <Modal
          open={!!manageTier}
          title={t("editTier")}
          onClose={() => setManageTier(undefined)}
          size="small"
        >
          {/* There is some overly complex state management going on here with the reloads being passed around */}
          <SubscriptionForm existing={tier} reload={reload} artist={artist} />
        </Modal>
      </div>
    </Box>
  );
};

export default ManageSubscriptionTierBox;
