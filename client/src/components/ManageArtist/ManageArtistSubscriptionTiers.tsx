import { css } from "@emotion/css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import SectionActionStrip from "components/common/SectionActionStrip";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTiers,
  useCreateSubscriptionTierMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPlus, FaWrench } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

import { ManageSectionWrapper } from "./ManageSectionWrapper";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorHandler = useErrorHandler();
  const snackbar = useSnackbar();

  const { artistId } = useParams();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const { data: tiers } = useQuery({
    ...queryManagedArtistSubscriptionTiers({
      artistId: Number(artistId),
    }),
    enabled: Boolean(artistId),
  });

  const { mutate, isPending } = useCreateSubscriptionTierMutation();

  const handleAddNewTier = () => {
    if (!artistId) return;
    mutate(
      {
        artistId: Number(artistId),
        name: t("untitledTier"),
      },
      {
        onSuccess: (result) => {
          snackbar(t("tierCreated"), { type: "success" });
          navigate(`/manage/artists/${artistId}/tiers/${result.result.id}`);
        },
        onError: (error) => {
          errorHandler(error);
        },
      }
    );
  };

  const handleTierReload = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryManagedArtistSubscriptionTiers({
        artistId: Number(artistId),
      }).queryKey,
    });
  };

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <SectionActionStrip>
        <ArtistButtonLink
          to="supporters"
          variant="dashed"
          size="compact"
          collapsible
          startIcon={<FaWrench />}
        >
          {t("supporters")}
        </ArtistButtonLink>
        <ArtistButton
          onClick={handleAddNewTier}
          startIcon={<FaPlus />}
          size="compact"
          variant="dashed"
          collapsible
          isLoading={isPending}
          disabled={isPending}
        >
          {t("addNewTier")}
        </ArtistButton>
      </SectionActionStrip>
      <div className="grid md:grid-cols-3 gap-2">
        {tiers?.results
          .sort((a, b) => (a.minAmount ?? 0) - (b.minAmount ?? 0))
          .map((tier) => (
            <ManageSubscriptionTierBox
              tier={tier}
              key={tier.id}
              reload={handleTierReload}
              artist={artist}
            />
          ))}
        <ArtistButton
          variant="dashed"
          className={css`
            .children {
              display: flex;
              align-items: center;
              justify-content: center;
            }
          `}
          startIcon={<FaPlus />}
          onClick={handleAddNewTier}
        >
          {t("addNewTier")}
        </ArtistButton>
      </div>
    </ManageSectionWrapper>
  );
};

export default ManageArtistSubscriptionTiers;
