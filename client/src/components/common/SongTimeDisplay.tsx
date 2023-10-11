import React from "react";
import { css } from "@emotion/css";

export const SongTimeDisplay: React.FC<{
  playerRef: React.RefObject<HTMLVideoElement>;
}> = ({ playerRef }) => {
  const duration = playerRef.current?.duration ?? 0;
  const currentSeconds = playerRef.current?.currentTime ?? 0;
  const percent = currentSeconds / duration;

  return (
    <div
      className={css`
        height: 0.5rem;
        margin-left: 1rem;
        margin-right: 1rem;
        border-radius: 1rem;
        background: rgba(0, 0, 0, 0.6);
        cursor: pointer;
        width: 100%;
      `}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        const divWidth = event.currentTarget.offsetWidth;
        const clickX = event.clientX - event.currentTarget.offsetLeft;
        const clickPercent = clickX / divWidth;

        playerRef.current?.fastSeek(clickPercent * duration);
      }}
    >
      <div
        className={css`
          height: 100%;
          overflow: none;
          border-radius: 1rem;
          transition: 0.1s width;
          width: ${percent * 100}%;
          background: rgba(0, 0, 0, 0.2);
          pointer-events: none;
        `}
      ></div>
    </div>
  );
};

export default SongTimeDisplay;
