import ReleaseCard from "components/common/ReleaseCard";
import SortableGridItem from "components/common/SortableGridItem";
import React from "react";
import { useAuthContext } from "state/AuthContext";
import { canUserEditArtist } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

const SortableTrackGroupItem: React.FC<{
  id: number;
  trackGroup: TrackGroup;
}> = (props) => {
  const { data: artist } = useArtistQuery();
  const { user } = useAuthContext();

  return (
    <SortableGridItem
      id={props.id}
      showHandle={canUserEditArtist(user, artist, { allowAdmin: false })}
    >
      <ReleaseCard trackGroup={props.trackGroup} as="li" headingLevel="h2" />
    </SortableGridItem>
  );
};

export default SortableTrackGroupItem;
