import { css } from "@emotion/css";
import PauseButton from "./PauseButton";
import PlayButton from "./PlayButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PlayControlButton: React.FC<{
  isPlaying?: boolean;
  onPlay?: () => Promise<void>;
}> = ({ onPlay, isPlaying }) => {
  const {
    state: { playing },
  } = useGlobalStateContext();

  const localIsPlaying = isPlaying !== undefined ? isPlaying : playing;

  return (
    <div
      className={css`
        button {
          color: var(--mi-white);
          background-color: var(--mi-black);
          border-color: var(--mi-black);
          display: flex;
          align-content: center;
          align-items: center;
          justify-content: center;
        }

        button:hover {
          border-color: var(--mi-black);
          color: var(--mi-black) !important;
          background-color: var(--mi-white);
        }

        @media (prefers-color-scheme: dark) {
          button {
            color: var(--mi-white);
            background: var(--mi-black);
            border-color: grey;
          }
          button:hover {
            border-color: var(--mi-white);
            color: var(--mi-black) !important;
            background-color: var(--mi-white) !important;
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
