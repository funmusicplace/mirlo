import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { useParams } from "react-router-dom";
import ArtistSubscriberDataDownload from "./ArtistSubscriberDataDownload";
import HeaderDiv from "components/common/HeaderDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();

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

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <HeaderDiv>
        <h2>{tManage("subscriptionTiers")}</h2>

        <ArtistSubscriberDataDownload />
      </HeaderDiv>
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
    </ManageSectionWrapper>
  );
};

export default ManageArtistSubscriptionTiers;
