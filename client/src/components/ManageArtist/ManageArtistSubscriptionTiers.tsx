import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import api from "services/api";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { useParams } from "react-router-dom";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageSubscriptions",
  });

  const [isLoadingSubscriberData, setIsLoadingSubscriberData] =
    React.useState(false);
  const {
    state: { artist },
  } = useArtistContext();
  const { artistId } = useParams();
  const [manageTier, setManageTier] = React.useState<ArtistSubscriptionTier>();
  const { objects: tiers, reload } =
    useGetUserObjectById<ArtistSubscriptionTier>(
      "artists",
      user?.id,
      artistId,
      `/subscriptionTiers`,
      { multiple: true }
    );

  const { t: tManage } = useTranslation("translation", { keyPrefix: "manage" });

  const userId = user?.id;

  const downloadSubscriberData = React.useCallback(async () => {
    setIsLoadingSubscriberData(true);
    try {
      if (userId && artistId) {
        await api.getFile(
          "artist-subscribers",
          `users/${userId}/artists/${artistId}/subscriptionTiers/download`,
          "text/csv"
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSubscriberData(false);
    }
  }, [artistId, userId]);

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        padding: 0.5rem 0 2rem 0;

        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          padding: 1rem 0.5rem 0rem;
        }
      `}
    >
      <h2>{tManage("subscriptionTiers")}</h2>
      <div
        className={css`
          margin-bottom: 1rem;
        `}
      >
        {tiers?.map((tier) => (
          <ManageSubscriptionTierBox
            tier={tier}
            key={tier.id}
            reload={reload}
            artist={artist}
          />
        ))}
      </div>
      <div
        className={css`
          padding-bottom: 2rem;
        `}
      >
        <Button
          onClick={downloadSubscriberData}
          isLoading={isLoadingSubscriberData}
        >
          {t("downloadSubscriberData")}
        </Button>
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
            reload={() => reload()}
            artist={artist}
          />
        </Modal>
      )}

      <SubscriptionForm artist={artist} reload={reload} />
    </div>
  );
};

export default ManageArtistSubscriptionTiers;
