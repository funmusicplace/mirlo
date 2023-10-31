import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useTranslation } from "react-i18next";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageSubscriptions",
  });

  const { artistId } = useParams();
  const [isLoadingSubscriberData, setIsLoadingSubscriberData] =
    React.useState(false);
  const [artist, setArtist] = React.useState<Artist>();
  const [manageTier, setManageTier] = React.useState<ArtistSubscriptionTier>();
  const [tiers, setTiers] = React.useState<ArtistSubscriptionTier[]>([]);

  const { t:tManage } = useTranslation("translation", { keyPrefix: "manage" });

  const userId = user?.id;

  const loadSubscriptions = React.useCallback(async () => {
    if (userId) {
      const { result } = await api.get<Artist>(
        `users/${userId}/artists/${artistId}`
      );
      setArtist(result);
      const fetchedSubscriptions = await api.getMany<ArtistSubscriptionTier>(
        `users/${userId}/artists/${artistId}/subscriptionTiers`
      );
      setTiers(fetchedSubscriptions.results);
    }
  }, [artistId, userId]);

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
            reload={loadSubscriptions}
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
