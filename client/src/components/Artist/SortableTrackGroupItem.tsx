import SortableGridItem from "components/common/SortableGridItem";
import React from "react";
import { useAuthContext } from "state/AuthContext";
import useArtistQuery from "utils/useArtistQuery";

import ArtistTrackGroup from "./ArtistTrackGroup";

const SortableTrackGroupItem: React.FC<{
  id: number;
  trackGroup: TrackGroup;
}> = (props) => {
  const { data: artist } = useArtistQuery();
  const { user } = useAuthContext();

  return (
    <SortableGridItem id={props.id} showHandle={user?.id === artist?.userId}>
      <ArtistTrackGroup trackGroup={props.trackGroup} as="li" />
    </SortableGridItem>
  );
};

export default SortableTrackGroupItem;
