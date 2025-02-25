import React from "react";

import AutoComplete from "./AutoComplete";
import api from "services/api";

const AutoCompleteTrackGroup: React.FC<{
  onSelect: (val: number) => void;
  filterByArtistId?: number;
  placeholder?: string;
}> = ({ onSelect, filterByArtistId, placeholder }) => {
  const getTrackGroupOptions = React.useCallback(
    async (searchString: string) => {
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
    [filterByArtistId]
  );

  return (
    <AutoComplete
      getOptions={getTrackGroupOptions}
      placeholder={placeholder}
      onSelect={(val) => onSelect(val as number)}
    />
  );
};

export default AutoCompleteTrackGroup;
