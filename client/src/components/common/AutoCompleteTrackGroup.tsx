import React from "react";

import AutoComplete from "./AutoComplete";
import api from "services/api";

const AutoCompleteTrackGroup: React.FC<{
  onSelect: (val: number) => void;
  filterByArtistId?: number;
}> = ({ onSelect, filterByArtistId }) => {
  const getTrackGroupOptions = React.useCallback(
    async (searchString: string) => {
      const query = filterByArtistId
        ? `trackGroups`
        : `${filterByArtistId}/trackGroups`;
      const results = await api.getMany<TrackGroup>(query, {
        title: searchString,
        take: "10",
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
      onSelect={(val) => onSelect(val as number)}
    />
  );
};

export default AutoCompleteTrackGroup;
