import { css } from "@emotion/css";
import React from "react";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useParams } from "react-router-dom";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import Button, { ButtonLink } from "components/common/Button";
import { FaPlus, FaWrench } from "react-icons/fa";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTiers,
} from "queries";
import { useQuery } from "@tanstack/react-query";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const [addingNewTier, setAddingNewTier] = React.useState(false);
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });

  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: tiers, refetch: refetchTiers } = useQuery(
    queryManagedArtistSubscriptionTiers({
      artistId: Number(artistId),
    })
  );

  if (!artist) {
    return null;
  }

  return (
    <>
      <ManageSectionWrapper>
        <SpaceBetweenDiv>
          <div />
          <div
            className={css`
              display: flex;
            `}
          >
            <ButtonLink
              to="supporters"
              className={css`
                margin-right: 0.25rem;
              `}
              variant="dashed"
              size="compact"
              collapsible
              startIcon={<FaWrench />}
            >
              {t("supporters")}
            </ButtonLink>
            <Button
              onClick={() => {
                setAddingNewTier(true);
              }}
              startIcon={<FaPlus />}
              size="compact"
              variant="dashed"
            >
              {t("addNewTier")}
            </Button>
          </div>
        </SpaceBetweenDiv>
        <div
          className={css`
            margin-bottom: 1rem;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
          `}
        >
          {tiers?.results.map((tier) => (
            <ManageSubscriptionTierBox
              tier={tier}
              key={tier.id}
              reload={refetchTiers}
              artist={artist}
            />
          ))}
        </div>
        <Modal
          open={addingNewTier}
          onClose={() => setAddingNewTier(false)}
          title={t("newSubscriptionTierFor", { artistName: artist.name }) ?? ""}
        >
          <SubscriptionForm artist={artist} reload={refetchTiers} />
        </Modal>
      </ManageSectionWrapper>
    </>
  );
};

export default ManageArtistSubscriptionTiers;
