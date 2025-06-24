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
        variant="outlined"
        title="Decrease volume"
        onClick={() => {
          setVolume((vol) => (vol === 0 ? 0 : +(vol -= 0.1).toFixed(1)));
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
            height: 0.25rem;
            overflow: none;
            transition: 0.1s width;
            width: ${volume * 100}%;
            background: var(--mi-white);
            pointer-events: none;
            border-radius: 0.5rem;
            position: absolute;
            top: 0.4rem;

            @media (prefers-color-scheme: light) {
              background: var(--mi-black);
            }
          `}
        />
        <div
          className={css`
            height: 0.25rem;
            overflow: none;
            width: 100%;
            background: var(--mi-white);
            pointer-events: none;
            position: absolute;
            top: 0.4rem;
            border-radius: 0.5rem;
            background: var(--mi-lighten-x-background-color);

            @media (prefers-color-scheme: light) {
              background: var(--mi-darken-x-background-color);
            }
          `}
        />
      </div>

      <Button
        startIcon={<FaVolumeUp />}
        variant="outlined"
        title="Increase volume"
        onClick={() => {
          setVolume((vol) => (vol === 1 ? 1 : +(vol += 0.1).toFixed(1)));
        }}
      />
    </div>
  );
};
