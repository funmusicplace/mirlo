import { css } from "@emotion/css";
import PauseButton from "./PauseButton";
import PlayButton from "./PlayButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PlayControlButton: React.FC<{
  isPlaying?: boolean;
  playerButton?: boolean;
  onPlay?: () => Promise<void>;
}> = ({ onPlay, isPlaying, playerButton }) => {
  const {
    state: { playing },
  } = useGlobalStateContext();

  const localIsPlaying = isPlaying !== undefined ? isPlaying : playing;

  return (
    <div
      className={css`
        button {
          ${playerButton ? "height: 2.5rem; width: 2.5rem;" : ""}
          color: var(--mi-white);
          background-color: var(--mi-black);
          border-color: var(--mi-black);
          display: flex;
          align-content: center;
          align-items: center;
          justify-content: center;

          span {
            ${playerButton
              ? "font-size: 1.1rem !important; padding: 20% 25% 25% 25%;"
              : ""}
          }
        }

        button:hover {
          border-color: var(--mi-black);
          color: var(--mi-black);
          background-color: var(--mi-white);
        }

        @media (prefers-color-scheme: dark) {
          button {
            color: var(--mi-white);
            background: var(--mi-black);
            border-color: grey !important;
          }
          button:hover {
            border-color: var(--mi-white);
            color: var(--mi-black);
            background-color: var(--mi-white);
          }
        }
      `}
    >
      {!localIsPlaying && <PlayButton onPlay={onPlay} />}
      {localIsPlaying && <PauseButton />}
    </div>
  );
};

export default PlayControlButton;
