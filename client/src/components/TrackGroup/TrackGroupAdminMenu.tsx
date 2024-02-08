import React from "react";

import DownloadAlbumButton from "components/common/DownloadAlbumButton";

const TrackGroupAdminMenu: React.FC<{
  trackGroup: TrackGroup;
}> = (props) => {
  return (
    <li>
      <DownloadAlbumButton trackGroup={props.trackGroup} />
    </li>
  );
};

export default TrackGroupAdminMenu;
