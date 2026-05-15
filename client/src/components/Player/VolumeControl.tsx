import { css } from "@emotion/css";
import Button from "components/common/Button";
import { FaVolumeMute } from "react-icons/fa";
import { FaVolumeHigh } from "react-icons/fa6";

import { bp } from "../../constants";

export const VolumeControl: React.FC<{
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  volume: number;
}> = ({ setVolume, volume }) => {
  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        width: 100px;
        margin-right: 1rem;
        margin-left: 1.5rem;

        @media screen and (max-width: ${bp.small}px) {
          display: none;
        }
      `}
    >
      <Button
        startIcon={volume === 0 ? <FaVolumeMute /> : <FaVolumeHigh />}
        variant="link"
        className={css`
          font-size: 1.25rem !important;
        `}
        title="Mute volume"
        onClick={() => {
          setVolume((val) => (val > 0 ? 0 : 0.5));
        }}
      />

      <div
        className={css`
          height: 1rem;
          filter: brightness(1);
          cursor: pointer;
          width: 100%;
          margin: 0 0.25rem;
          top: 0;
          position: inherit;
        `}
        aria-label="Volume control"
        role="button"
        title="Volume control"
        onMouseUp={(event: React.MouseEvent<HTMLDivElement>) => {
          const divWidth = event.currentTarget.offsetWidth;
          const clickX = event.clientX - event.currentTarget.offsetLeft;
          const clickPercent = clickX / divWidth;
          if (isFinite(clickPercent)) {
            setVolume(+clickPercent.toFixed(1));
          }
        }}
      >
        <div
          className={css`
            height: 0.25rem;
            overflow: none;
            transition: 0.1s width;
            width: ${volume * 100}%;
            background: var(--mi-fixed-fg-color);
            pointer-events: none;
            border-radius: 0.5rem;
            position: absolute;
            top: 0.4rem;
          `}
        />
        <div
          className={css`
            height: 0.25rem;
            overflow: none;
            width: 100%;
            background: color-mix(
              in srgb,
              var(--mi-fixed-fg-color) 25%,
              transparent
            );
            pointer-events: none;
            position: absolute;
            top: 0.4rem;
            border-radius: 0.5rem;
          `}
        />
      </div>
    </div>
  );
};
