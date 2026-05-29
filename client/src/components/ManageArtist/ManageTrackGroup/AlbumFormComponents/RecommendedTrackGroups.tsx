import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import CommandSearch, {
  CommandSearchSection,
} from "components/common/CommandSearch/CommandSearch";
import { queryTrackGroups } from "queries";
import {
  queryManagedRecommendedTrackGroups,
  useAddRecommendedTrackGroupMutation,
  useRemoveRecommendedTrackGroupMutation,
} from "queries/trackGroups";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import { useDebounce } from "use-debounce";

const RecommendedTrackGroups: React.FC<{
  trackGroupId: number;
}> = ({ trackGroupId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { t: tShared } = useTranslation("translation", {
    keyPrefix: "commandSearch",
  });
  const snackbar = useSnackbar();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const { data: { results } = {}, refetch } = useQuery(
    queryManagedRecommendedTrackGroups(trackGroupId)
  );

  const addMutation = useAddRecommendedTrackGroupMutation();
  const removeMutation = useRemoveRecommendedTrackGroupMutation();

  const [debouncedQuery] = useDebounce(query, 300);
  const trimmed = debouncedQuery.trim();
  const searchActive = open && trimmed.length >= 2;

  const searchQ = useQuery({
    ...queryTrackGroups({ q: trimmed, take: 10 }),
    enabled: searchActive,
  });

  React.useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleAddRecommendation = React.useCallback(
    (recommendedTrackGroupId: number) => {
      addMutation.mutate(
        {
          trackGroupId,
          recommendedTrackGroupId,
        },
        {
          onSuccess: () => {
            refetch();
            snackbar(t("recommendationAdded"), { type: "success" });
          },
          onError: () => {
            snackbar(t("recommendationError"), { type: "warning" });
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

  const sections = React.useMemo<CommandSearchSection[]>(() => {
    if (!searchActive) return [];
    const items = (searchQ.data?.results ?? [])
      .filter(
        (tg) =>
          tg.id !== trackGroupId && !results?.some((rec) => rec.id === tg.id)
      )
      .map((tg) => ({
        key: `trackGroup-${tg.id}`,
        node: `${tg.artist?.name ?? ""} · ${tg.title}`,
        onSelect: () => handleAddRecommendation(tg.id),
      }));
    return items.length > 0
      ? [{ category: tShared("categoryReleases"), items }]
      : [];
  }, [
    searchActive,
    searchQ.data,
    results,
    trackGroupId,
    handleAddRecommendation,
    tShared,
  ]);

  return (
    <>
      <h2>{t("recommendedAlbums")}</h2>

      {(results?.length ?? 0) > 0 && (
        <div className="mb-8">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 mt-4">
            {results?.map((rec: TrackGroup) => (
              <li
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
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <ArtistButton
          wrap
          type="button"
          onClick={() => setOpen(true)}
          isLoading={addMutation.isPending}
        >
          {t("addRecommendedAlbum")}
        </ArtistButton>
      </div>

      <CommandSearch
        open={open}
        onClose={() => setOpen(false)}
        title={t("addRecommendedAlbum")}
        placeholder={t("searchPlaceholder")}
        query={query}
        onQueryChange={setQuery}
        sections={sections}
        isLoading={searchQ.isFetching}
      />
    </>
  );
};

export default RecommendedTrackGroups;
