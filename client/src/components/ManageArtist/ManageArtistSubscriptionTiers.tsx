import { css } from "@emotion/css";
import React from "react";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import { useParams, useNavigate } from "react-router-dom";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import { useTranslation } from "react-i18next";
import Button, { ButtonLink } from "components/common/Button";
import { FaPlus, FaWrench } from "react-icons/fa";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTiers,
  useCreateSubscriptionTierMutation,
} from "queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { ArtistButton } from "components/Artist/ArtistButtons";

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
            onClick={handleAddNewTier}
            startIcon={<FaPlus />}
            size="compact"
            variant="dashed"
            isLoading={isPending}
            disabled={isPending}
          >
            {t("addNewTier")}
          </Button>
        </div>
      </SpaceBetweenDiv>
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
