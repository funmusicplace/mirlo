import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import SectionActionStrip from "components/common/SectionActionStrip";
import { tipButtonStyle } from "components/common/TipArtist";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTiers,
  useCreateSubscriptionTierMutation,
  useUpdateArtistMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDonate, FaMinus, FaPlus, FaWrench } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useSortableReorder from "utils/useSortableReorder";

import { ManageSectionWrapper } from "components/ManageArtist/ManageSectionWrapper";
import ManageSubscriptionTierBox from "components/ManageArtist/ManageSubscriptionTierBox";

const Index: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });
  const { t: tArtist } = useTranslation("translation", { keyPrefix: "artist" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorHandler = useErrorHandler();
  const snackbar = useSnackbar();
  const { user } = useAuthContext();

  const { artistId } = useParams();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const { data: tiers } = useQuery({
    ...queryManagedArtistSubscriptionTiers({
      artistId: Number(artistId),
    }),
    enabled: Boolean(artistId),
  });

  const { mutate, isPending } = useCreateSubscriptionTierMutation();
  const { mutate: updateArtist, isPending: isUpdatingArtist } =
    useUpdateArtistMutation();

  const handleToggleTipButton = () => {
    if (!artist || !user) return;
    updateArtist({
      userId: user.id,
      artistId: artist.id,
      body: {
        properties: {
          showTipOnSupportPage: !artist.properties?.showTipOnSupportPage,
        },
      },
    });
  };

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

  const {
    items: orderedTiers,
    sensors,
    onDragEnd,
  } = useSortableReorder(tiers?.results, async (tierIds) => {
    await api.put(`manage/artists/${artistId}/subscriptionTierOrder`, {
      tierIds,
    });
    await handleTierReload();
  });

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
          onClick={handleToggleTipButton}
          startIcon={
            artist.properties?.showTipOnSupportPage ? <FaMinus /> : <FaPlus />
          }
          size="compact"
          variant="dashed"
          collapsible
          isLoading={isUpdatingArtist}
          disabled={isUpdatingArtist}
        >
          {artist.properties?.showTipOnSupportPage
            ? t("removeTipButton")
            : t("addTipButton")}
        </ArtistButton>
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
      {artist.properties?.showTipOnSupportPage && (
        <div className="mb-3">
          <div
            aria-hidden
            className="flex justify-end opacity-50 pointer-events-none"
          >
            <ArtistButton
              className={`tip-artist ${tipButtonStyle}`}
              type="button"
              disabled
              startIcon={<FaDonate />}
            >
              {tArtist("tipArtistByName", { artistName: artist.name })}
            </ArtistButton>
          </div>
          {tiers?.results.length === 0 && (
            <small className="block text-right mt-2">
              {t("tipOnlySupportExplanation")}
            </small>
          )}
        </div>
      )}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid md:grid-cols-3 gap-2">
          {orderedTiers && (
            <SortableContext items={orderedTiers}>
              {orderedTiers.map((tier) => (
                <ManageSubscriptionTierBox
                  key={tier.id}
                  tier={tier}
                  reload={handleTierReload}
                  artist={artist}
                />
              ))}
            </SortableContext>
          )}
          <ArtistButton
            variant="dashed"
            className="[&_.children]:flex [&_.children]:items-center [&_.children]:justify-center"
            startIcon={<FaPlus />}
            onClick={handleAddNewTier}
          >
            {t("addNewTier")}
          </ArtistButton>
        </div>
      </DndContext>
    </ManageSectionWrapper>
  );
};

export default Index;
