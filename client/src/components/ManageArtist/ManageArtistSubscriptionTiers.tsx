import { css } from "@emotion/css";
import React from "react";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useArtistContext } from "state/ArtistContext";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { Link, useParams } from "react-router-dom";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { FaPlus, FaWrench } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const { user } = useAuthContext();
  const [addingNewTier, setAddingNewTier] = React.useState(false);
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });

  const {
    state: { artist },
  } = useArtistContext();
  const { artistId } = useParams();
  const { objects: tiers, reload } =
    useGetUserObjectById<ArtistSubscriptionTier>(
      "artists",
      user?.id,
      artistId,
      `/subscriptionTiers`,
      { multiple: true },
    );

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <SpaceBetweenDiv>
        <div />
        <div>
          <Link
            to="supporters"
            className={css`
              margin-right: 0.25rem;
            `}
          >
            <Button
              variant="dashed"
              compact
              collapsible
              startIcon={<FaWrench />}
            >
              {t("supporters")}
            </Button>
          </Link>
          <Button
            transparent
            onClick={() => {
              setAddingNewTier(true);
            }}
            startIcon={<FaPlus />}
            compact
            variant="dashed"
          >
            {t("addNewTier")}
          </Button>
        </div>
      </SpaceBetweenDiv>
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
      <Modal
        open={addingNewTier}
        onClose={() => setAddingNewTier(false)}
        title={t("newSubscriptionTierFor", { artistName: artist.name }) ?? ""}
      >
        <SubscriptionForm artist={artist} reload={reload} />
      </Modal>
    </ManageSectionWrapper>
  );
};

export default ManageArtistSubscriptionTiers;
