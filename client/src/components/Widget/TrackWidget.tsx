import { css } from "@emotion/css";
import { AudioWrapper } from "components/AudioWrapper";
import ClickToPlay from "components/common/ClickToPlay";
import SmallTileDetails from "components/common/SmallTileDetails";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";

const TrackWidget = () => {
  const params = useParams();
  const [track, setTrack] = React.useState<Track>();

  React.useEffect(() => {
    const callback = async () => {
      try {
        const results = await api.get<Track>(`tracks/${params.id}`);
        setTrack(results.result);
      } catch (e) {
        console.error("e", e);
      }
    };

    callback();
  }, [params.id]);
  return (
    <>
      {track && (
        <div
          className={css`
            display: flex;
            padding: 1rem;
            background: white;
            border-radius: 1rem;
          `}
        >
          {track.isPreview && (
            <ClickToPlay
              trackId={track.id}
              title={track.title}
              image={{
                width: 120,
                height: 120,
                url: track.trackGroup.cover?.sizes?.[120] ?? "",
              }}
            />
          )}

          <SmallTileDetails
            title={track.title}
            subtitle={track.trackGroup.title}
            footer={track.trackGroup.artist.name}
          />
          <div
            className={css`
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              flex-grow: 1;
            `}
          >
            <AudioWrapper currentTrack={track} />
          </div>
        </div>
      )}
    </>
  );
};

export default TrackWidget;
