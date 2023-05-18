import { css } from "@emotion/css";
// import { AudioWrapper } from "components/AudioWrapper";
// import ClickToPlay from "components/common/ClickToPlay";
import IconButton from "components/common/IconButton";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import SmallTileDetails from "components/common/SmallTileDetails";
import React from "react";
import { FaPlay } from "react-icons/fa";
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
            background: var(--mi-normal-background-color);
            border-radius: 1rem;
            align-items: center;
          `}
        >
          <ImageWithPlaceholder
            src={track.trackGroup.cover?.sizes?.[120] ?? ""}
            alt={track.title}
            size={120}
          />

          <SmallTileDetails
            title={track.title}
            subtitle={track.trackGroup.title}
            footer={track.trackGroup.artist.name}
          />

          {track.isPreview && (
            <IconButton
              onClick={() => {
                window.parent.postMessage("mirlo:play:track:" + track.id);
              }}
            >
              <FaPlay />
            </IconButton>
          )}
        </div>
      )}
    </>
  );
};

export default TrackWidget;
