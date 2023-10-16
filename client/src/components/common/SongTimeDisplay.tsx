/** @jsxImportSource @emotion/react */
import React from "react";
import { css } from "@emotion/css";
import { css as reactCss } from "@emotion/react";

export const SongTimeDisplay: React.FC<{
  playerRef: React.RefObject<HTMLVideoElement>;
}> = ({ playerRef }) => {
  const duration = playerRef.current?.duration ?? 0;
  const currentSeconds = playerRef.current?.currentTime ?? 0;
  const percent = currentSeconds / duration;
  console.log("duration", playerRef.current?.duration);
  return (
    <div
      className={css`
        height: 0.25rem;
        background: rgba(0, 0, 0, 0.05);
        cursor: pointer;
        width: 100%;
        top: 0;
        position: absolute;
      `}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        const divWidth = event.currentTarget.offsetWidth;
        const clickX = event.clientX - event.currentTarget.offsetLeft;
        const clickPercent = clickX / divWidth;
        console.log("clicking", clickPercent * duration);
        if (isFinite(clickPercent) && isFinite(duration)) {
          playerRef.current?.fastSeek(clickPercent * duration);
        }
      }}
    >
      <div
        css={(theme) => reactCss`
          height: 100%;
          overflow: none;
          transition: 0.1s width;
          width: ${percent * 100}%;
          background: ${theme.colors.primary};
          pointer-events: none;
        `}
      ></div>
    </div>
  );
};

export default SongTimeDisplay;
