import React from "react";

import AutoComplete from "./AutoComplete";
import api from "services/api";
import { hasId } from "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/ManageTags";

const AutoCompleteTrackGroup: React.FC<{
  onSelect: (val: number) => void;
  filterByArtistId?: number;
  placeholder?: string;
  includeLabelReleases?: boolean;
}> = ({ onSelect, filterByArtistId, placeholder, includeLabelReleases }) => {
  const getTrackGroupOptions = React.useCallback(
    async (searchString: string) => {
      if (filterByArtistId && includeLabelReleases) {
        const results = await api.getMany<TrackGroup>(
          `manage/artists/${filterByArtistId}/trackGroups`,
          { includeLabelReleases: "true" }
        );
        return results.results
          .filter((r) =>
            r.title.toLowerCase().includes(searchString.toLowerCase())
          )
          .slice(0, 10)
          .map((r) => ({
            name: `${r.artist?.name} - ${r.title}`,
            id: r.id,
          }));
      }
      const results = await api.getMany<TrackGroup>("trackGroups", {
        title: searchString,
        take: "10",
        ...(filterByArtistId ? { artistId: `${filterByArtistId}` } : {}),
      });
      return results.results.map((r) => ({
        name: `${r.artist?.name} - ${r.title}`,
        id: r.id,
      }));
    },
    [filterByArtistId, includeLabelReleases]
  );

  return (
    <AutoComplete
      getOptions={getTrackGroupOptions}
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
