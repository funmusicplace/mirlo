import { css } from "@emotion/css";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useArtistContext } from "state/ArtistContext";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { Link, useParams } from "react-router-dom";
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
  const { objects: tiers, reload } =
    useGetUserObjectById<ArtistSubscriptionTier>(
      "artists",
      user?.id,
      artistId,
      `/subscriptionTiers`,
      { multiple: true }
    );

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <HeaderDiv>
        <div />
        <Link to="supporters">Supporters</Link>
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

      <SubscriptionForm artist={artist} reload={reload} />
    </ManageSectionWrapper>
  );
};

export default ManageArtistSubscriptionTiers;
