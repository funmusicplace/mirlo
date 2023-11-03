import React from "react";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import api from "services/api";
import { css } from "@emotion/css";

const Releases = () => {
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);

  React.useEffect(() => {
    const callback = async () => {
      const results = await api.getMany<TrackGroup>("trackGroups");
      setTrackGroups(results.results);
    };

    callback();
  }, []);

  return (
    <div>
      <h1>Releases</h1>
      <div
        className={css`
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
        `}
      >
        {trackGroups?.map((trackGroup) => (
          <ArtistTrackGroup key={trackGroup.id} trackGroup={trackGroup} />
        ))}
      </div>
    </div>
  );
};

export default Releases;
