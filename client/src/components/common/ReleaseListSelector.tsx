import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import LoadingSpinner from "./LoadingSpinner";
import { useAuthContext } from "state/AuthContext";
import { InputEl } from "./Input";

interface ReleaseListSelectorProps {
  artistId: number;
  selectedReleaseIds?: number[];
  onSelectChange: (releaseIds: number[]) => void;
  maxHeight?: string;
  isSaving?: boolean;
}

const ReleaseListSelector: React.FC<ReleaseListSelectorProps> = ({
  artistId,
  selectedReleaseIds = [],
  onSelectChange,
  maxHeight = "400px",
  isSaving = false,
}) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const [releases, setReleases] = React.useState<TrackGroup[]>([]);
  const [filteredReleases, setFilteredReleases] = React.useState<TrackGroup[]>(
    []
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const selected = React.useMemo(
    () => new Set(selectedReleaseIds),
    [selectedReleaseIds]
  );

  // Fetch all releases for the artist
  React.useEffect(() => {
    const fetchReleases = async () => {
      try {
        setIsLoading(true);
        const results = await api.getMany<TrackGroup>(
          `manage/artists/${artistId}/trackGroups`,
          user?.isLabelAccount ? { includeLabelReleases: "true" } : undefined
        );
        setReleases(results.results);
        setFilteredReleases(results.results);
      } catch (error) {
        console.error(t("failedToFetch"), error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReleases();
  }, [artistId]);

  // Filter releases based on search query
  React.useEffect(() => {
    const filtered = releases.filter(
      (release) =>
        (release.title ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        release.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredReleases(filtered);
  }, [searchQuery, releases]);

  const handleCheckboxChange = (releaseId: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(releaseId)) {
      newSelected.delete(releaseId);
    } else {
      newSelected.add(releaseId);
    }
    onSelectChange(Array.from(newSelected));
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <InputEl
        type="text"
        placeholder={t("searchAlbums")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="small" />
        </div>
      ) : (
        <div
          className="border border-(--mi-darken-xx-background-color) rounded overflow-y-auto"
          style={{ maxHeight }}
        >
          {filteredReleases.length === 0 ? (
            <div className="p-3 text-center">
              {releases.length === 0 ? t("noReleases") : t("noResults")}
            </div>
          ) : (
            <div className="divide-y divide-(--mi-darken-xx-background-color)">
              {filteredReleases.map((release) => (
                <label
                  key={release.id}
                  className="flex items-center gap-3 p-2 hover:backdrop-brightness-90 font-normal! cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(release.id)}
                    onChange={() => handleCheckboxChange(release.id)}
                    className="w-4 h-4 cursor-pointer"
                  />

                  {release.cover && (
                    <img
                      src={release.cover.sizes?.[120] ?? release.cover.url?.[0]}
                      alt={release.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  {!release.cover && (
                    <div className="w-10 h-10 rounded flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate size-sm">
                    {release.artist.name}
                  </span>
                  <span className="flex-1 truncate">{release.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedReleaseIds.length > 0 && (
        <div className="flex text-sm gap-2 items-center">
          {t("selected")}: {selectedReleaseIds.length}
          {isSaving && (
            <>
              <LoadingSpinner size="small" />
              <span className="text-secondary">{t("saving")}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ReleaseListSelector;
