import { css } from "@emotion/css";
import Button from "components/common/Button";
import { FaVolumeDown, FaVolumeUp } from "react-icons/fa";
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
        width: 140px;

        @media screen and (max-width: ${bp.small}px) {
          display: none;
        }
      `}
    >
      <Button
        startIcon={<FaVolumeDown />}
        onClick={() => {
          setVolume((vol) => (vol === 0 ? 0 : +(vol -= 0.1).toFixed(1)));
        }}
      />

      <div
        className={css`
          height: 0.25rem;
          filter: brightness(1);
          background: var(--mi-lighten-x-background-color);
          cursor: pointer;
          width: 100%;
          margin: 0 0.25rem;
          top: 0;
          position: ${volume};

          @media (prefers-color-scheme: light) {
            background: var(--mi-darken-x-background-color);
          }
        `}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
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
            height: 100%;
            overflow: none;
            transition: 0.1s width;
            width: ${volume * 100}%;
            background: var(--mi-white);
            pointer-events: none;
            border-radius: 0.5rem;

            @media (prefers-color-scheme: light) {
              background: var(--mi-black);
            }
          `}
        ></div>
      </div>

      <Button
        startIcon={<FaVolumeUp />}
        onClick={() => {
          setVolume((vol) => (vol === 1 ? 1 : +(vol += 0.1).toFixed(1)));
        }}
      />
    </div>
  );
};
