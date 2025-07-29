import React from "react";
import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import useArtistQuery from "utils/useArtistQuery";

export const SongTimeDisplay: React.FC<{
  position: string;
  playerRef: React.RefObject<HTMLVideoElement>;
  currentSeconds: number;
}> = ({ playerRef, currentSeconds, position }) => {
  const duration = playerRef.current?.duration ?? 0;
  const percent = currentSeconds / duration;

  return (
    <div
      className={css`
        height: 1rem;
        filter: brightness(1);
        cursor: pointer;
        width: 100%;
        top: 0;
        position: ${position};
      `}
      title="Current track time"
      aria-label="Current track time"
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        const divWidth = event.currentTarget.offsetWidth;
        const clickX = event.clientX - event.currentTarget.offsetLeft;
        const clickPercent = clickX / divWidth;
        if (isFinite(clickPercent) && isFinite(duration) && playerRef.current) {
          playerRef.current.currentTime = clickPercent * duration;
        }
      }}
    >
      <div
        className={css`
          height: 0.4rem;
          overflow: none;
          transition: 0.2s width;
          width: ${percent * 100}%;
          background: var(--mi-pink);
          pointer-events: none;
        `}
      ></div>
    </div>
  );
};

export default SongTimeDisplay;
