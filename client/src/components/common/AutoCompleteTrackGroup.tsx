import { hasId } from "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/ManageTags";
import React from "react";
import api from "services/api";
import { useReleaseArtistName } from "utils/useReleaseArtistName";

import AutoComplete from "./AutoComplete";

const AutoCompleteTrackGroup: React.FC<{
  id: string;
  onSelect: (val: number) => void;
  ariaDescribedBy?: string;
  filterByArtistId?: number;
  placeholder?: string;
  includeLabelReleases?: boolean;
}> = ({
  id,
  onSelect,
  ariaDescribedBy,
  filterByArtistId,
  placeholder,
  includeLabelReleases,
}) => {
  const { releaseArtistName } = useReleaseArtistName();
  const getTrackGroupOptions = React.useCallback(
    async (searchString: string) => {
      if (filterByArtistId && includeLabelReleases) {
        const results = await api.getMany<TrackGroup>(
          `manage/artists/${filterByArtistId}/trackGroups`,
          { includeLabelReleases: "true" }
        );
        return results.results
          .filter((r) =>
            r.title?.toLowerCase().includes(searchString.toLowerCase())
          )
          .slice(0, 10)
          .map((r) => ({
            name: [releaseArtistName(r), r.title].filter(Boolean).join(" - "),
            id: r.id,
          }));
      }
      const results = await api.getMany<TrackGroup>("trackGroups", {
        title: searchString,
        take: "10",
        ...(filterByArtistId ? { artistId: `${filterByArtistId}` } : {}),
      });
      return results.results.map((r) => ({
        name: [releaseArtistName(r), r.title].filter(Boolean).join(" - "),
        id: r.id,
      }));
    },
    [filterByArtistId, includeLabelReleases, releaseArtistName]
  );

  return (
    <AutoComplete
      ariaDescribedBy={ariaDescribedBy}
      getOptions={getTrackGroupOptions}
      id={id}
      placeholder={placeholder}
      onSelect={(val) => {
        if (typeof val === "number") {
          onSelect(val);
        } else if (hasId(val) && typeof val.id === "number") {
          onSelect(val.id);
        }
      }}
    />
  );
};

export default AutoCompleteTrackGroup;
