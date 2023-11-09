import React from "react";

import DownloadAlbumButton from "components/common/DownloadAlbumButton";

const TrackGroupAdminMenu: React.FC<{
  trackGroup: TrackGroup;
}> = (props) => {
  return <DownloadAlbumButton trackGroup={props.trackGroup} />;
};

export default TrackGroupAdminMenu;
