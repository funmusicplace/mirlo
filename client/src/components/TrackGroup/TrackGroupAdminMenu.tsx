import React from "react";

import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import { useQuery } from "@tanstack/react-query";
import { queryTrackGroup } from "queries";

const TrackGroupAdminMenu: React.FC<{
  trackGroupId: number;
}> = ({ trackGroupId }) => {
  const { data: trackGroup } = useQuery(
    queryTrackGroup({ albumSlug: `${trackGroupId ?? ""}` })
  );
  if (!trackGroup) {
    return null;
  }
  return (
    <li>
      <DownloadAlbumButton trackGroup={trackGroup} />
    </li>
  );
};

export default TrackGroupAdminMenu;
