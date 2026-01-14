import { css } from "@emotion/css";
import PauseButton from "./PauseButton";
import PlayButton from "./PlayButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PlayControlButton: React.FC<{
  isPlaying?: boolean;
  playerButton?: boolean;
  onPlay?: () => Promise<void>;
  disabled?: boolean;
  onArtistPage?: boolean;
}> = ({ onPlay, isPlaying, playerButton, disabled, onArtistPage }) => {
  const {
    state: { playing },
  } = useGlobalStateContext();

  const localIsPlaying = isPlaying !== undefined ? isPlaying : playing;

  return (
    <div
      className={css`
        button {
          ${playerButton ? "height: 2.5rem; width: 2.5rem;" : ""}
          display: flex;
          align-content: center;
          align-items: center;
          justify-content: center;

          span {
            ${playerButton ? "font-size: 1.1rem !important; " : ""}
          }

          svg {
            ${playerButton ? "fill: lightgrey; " : ""}
          }
        }
      `}
    >
      {!localIsPlaying && (
        <PlayButton
          onPlay={onPlay}
          variant="outlined"
          onArtistPage={onArtistPage}
          disabled={disabled}
        />
      )}
      {localIsPlaying && <PauseButton />}
    </div>
  );
};

export default PlayControlButton;
