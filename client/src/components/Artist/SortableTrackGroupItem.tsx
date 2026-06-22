import SortableGridItem from "components/common/SortableGridItem";
import React from "react";
import { useAuthContext } from "state/AuthContext";
import useArtistQuery from "utils/useArtistQuery";

import ReleaseCard from "components/common/ReleaseCard";

const SortableTrackGroupItem: React.FC<{
  id: number;
  trackGroup: TrackGroup;
}> = (props) => {
  const { data: artist } = useArtistQuery();
  const { user } = useAuthContext();

  return (
    <SortableGridItem id={props.id} showHandle={user?.id === artist?.userId}>
      <ReleaseCard trackGroup={props.trackGroup} as="li" headingLevel="h2" />
    </SortableGridItem>
  );
};

export default SortableTrackGroupItem;
