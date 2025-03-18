import React from "react";

import AutoComplete from "./AutoComplete";
import api from "services/api";
import { hasId } from "components/ManageArtist/AlbumFormComponents/ManageTags";

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
