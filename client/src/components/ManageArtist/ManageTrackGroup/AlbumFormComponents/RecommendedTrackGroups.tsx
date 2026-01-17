import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "services/api";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { FormSection } from "./AlbumFormContent";
import { FaTrash } from "react-icons/fa";
import AutoComplete from "components/common/AutoComplete";
import {
  queryManagedRecommendedTrackGroups,
  useAddRecommendedTrackGroupMutation,
  useRemoveRecommendedTrackGroupMutation,
} from "queries/trackGroups";
import { ArtistButton } from "components/Artist/ArtistButtons";

const RecommendedTrackGroups: React.FC<{
  trackGroupId: number;
}> = ({ trackGroupId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const [showSearch, setShowSearch] = React.useState(false);

  const { data: { results } = {}, refetch } = useQuery(
    queryManagedRecommendedTrackGroups(trackGroupId)
  );

  const addMutation = useAddRecommendedTrackGroupMutation();
  const removeMutation = useRemoveRecommendedTrackGroupMutation();

  const searchTrackGroups = React.useCallback(
    async (search: string) => {
      try {
        const response = await api.getMany<TrackGroup>(`trackGroups`, {
          title: search,
          take: `10`,
        });
        const searchResults = response.results || [];
        // Filter out already recommended track groups and the current track group
        return searchResults
          .filter(
            (tg) =>
              tg.id !== trackGroupId &&
              !results?.some((rec) => rec.id === tg.id)
          )
          .map((tg: TrackGroup) => ({
            id: tg.id,
            name: `${tg.title} by ${tg.artist?.name}`,
          }));
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    [trackGroupId, results]
  );

  const handleAddRecommendation = React.useCallback(
    (value: string | number | { id: string | number; name: string }) => {
      const recommendedTrackGroupId =
        typeof value === "object" ? value.id : value;
      addMutation.mutate(
        {
          trackGroupId,
          recommendedTrackGroupId: Number(recommendedTrackGroupId),
        },
        {
          onSuccess: () => {
            setShowSearch(false);
            refetch();
            snackbar(t("recommendationAdded"), {
              type: "success",
            });
          },
          onError: () => {
            snackbar(t("recommendationError"), {
              type: "warning",
            });
          },
        }
      );
    },
    [addMutation, trackGroupId, refetch, snackbar, t]
  );

  const handleRemoveRecommendation = (recommendedTrackGroupId: number) => {
    removeMutation.mutate(
      {
        trackGroupId,
        recommendedTrackGroupId,
      },
      {
        onSuccess: () => {
          refetch();
          snackbar(t("recommendationRemoved"), { type: "success" });
        },
        onError: () => {
          snackbar(t("recommendationError"), { type: "warning" });
        },
      }
    );
  };

  return (
    <FormSection>
      <h2>{t("recommendedAlbums")}</h2>

      {(results?.length ?? 0) > 0 && (
        <div className="mb-8">
          <h3>{t("currentRecommendations")}</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 mt-4">
            {results?.map((rec: TrackGroup) => (
              <div
                key={rec.id}
                className="relative border border-gray-300 rounded p-2 flex flex-col gap-2"
              >
                {rec.cover?.sizes?.[300] && (
                  <img
                    src={rec.cover.sizes[300]}
                    alt={rec.title}
                    className="w-full h-auto rounded"
                  />
                )}
                <div>
                  <p className="text-sm font-bold m-0">{rec.title}</p>
                  <p className="text-xs text-gray-600 m-0">{rec.artist.name}</p>
                </div>
                <ArtistButton
                  type="button"
                  onClick={() => handleRemoveRecommendation(rec.id)}
                  isLoading={removeMutation.isPending}
                  startIcon={<FaTrash />}
                  className="mt-auto"
                >
                  {t("remove")}
                </ArtistButton>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {!showSearch ? (
          <ArtistButton
            type="button"
            onClick={() => setShowSearch(true)}
            isLoading={addMutation.isPending}
          >
            {t("addRecommendedAlbum")}
          </ArtistButton>
        ) : (
          <>
            <FormComponent>
              <label>{t("searchAlbums")}</label>
              <AutoComplete
                getOptions={searchTrackGroups}
                onSelect={handleAddRecommendation}
                placeholder={t("searchPlaceholder")}
              />
            </FormComponent>

            <ArtistButton
              type="button"
              onClick={() => {
                setShowSearch(false);
              }}
              className="mt-4"
            >
              {t("cancel")}
            </ArtistButton>
          </>
        )}
      </div>
    </FormSection>
  );
};

export default RecommendedTrackGroups;
