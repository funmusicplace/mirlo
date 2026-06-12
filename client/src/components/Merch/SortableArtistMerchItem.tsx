import SortableGridItem from "components/common/SortableGridItem";
import React from "react";
import { useAuthContext } from "state/AuthContext";

import ArtistMerchListItem from "./ArtistMerchListItem";

const SortableArtistMerchItem: React.FC<{
  id: string;
  merch: Merch & { artist?: Artist };
}> = (props) => {
  const { user } = useAuthContext();

  return (
    <SortableGridItem
      id={props.id}
      showHandle={user?.id === props.merch.artist?.userId}
    >
      <ArtistMerchListItem merch={props.merch} as="li" />
    </SortableGridItem>
  );
};

export default SortableArtistMerchItem;
