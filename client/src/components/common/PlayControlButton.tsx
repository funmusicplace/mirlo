import { css } from "@emotion/css";
import { playerControlHoverWrapperClass } from "components/Player/playerButtonClasses";
import { useGlobalStateContext } from "state/GlobalState";

import PauseButton from "./PauseButton";
import PlayButton from "./PlayButton";

export const PlayControlButton: React.FC<{
  isPlaying?: boolean;
  playerButton?: boolean;
  onPlay?: () => Promise<void>;
  disabled?: boolean;
  onArtistPage?: boolean;
  className?: string;
}> = ({
  onPlay,
  isPlaying,
  playerButton,
  disabled,
  onArtistPage,
  className,
}) => {
  const {
    state: { playing },
  } = useGlobalStateContext();

  const localIsPlaying = isPlaying !== undefined ? isPlaying : playing;

  return (
    <div
      className={[
        playerButton ? playerControlHoverWrapperClass : undefined,
        className,
        css`
          button {
            ${playerButton ? "height: 2.5rem; width: 2.5rem;" : ""}
            display: flex;
            align-content: center;
            align-items: center;
            justify-content: center;

            span {
              ${playerButton ? "font-size: 1.1rem !important; " : ""}
            }
          }
        `,
      ]
        .filter(Boolean)
        .join(" ")}
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
