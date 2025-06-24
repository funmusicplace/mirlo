import React from "react";
import { css } from "@emotion/css";
import { VscPlay } from "react-icons/vsc";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "./Button";
import { useTranslation } from "react-i18next";
import { ArtistButton } from "components/Artist/ArtistButtons";

export const PlayButton: React.FC<{
  onPlay?: () => Promise<void> | void;
  className?: string;
  variant?: "outlined";
  disabled?: boolean;
  onArtistPage?: boolean;
}> = ({ onPlay, className, variant, disabled = false, onArtistPage }) => {
  const { dispatch } = useGlobalStateContext();

  const onPlayCallback = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch]);

  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });

  return (
    <div
      className={
        css`
          button {
            font-size: 1.4rem;
            margin-right: 0.25rem;
            padding: 0.7rem 0.6rem 0.7rem 0.8rem;
          }
        ` +
        " " +
        className
      }
    >
      {onArtistPage && (
        <ArtistButton
          startIcon={<VscPlay />}
          onClick={onPlay ?? onPlayCallback}
          aria-label={`${t("play")}`}
          title={`${t("play")}`}
          className="play-button"
          variant={variant}
          disabled={disabled}
        />
      )}
      {!onArtistPage && (
        <Button
          startIcon={<VscPlay />}
          onClick={onPlay ?? onPlayCallback}
          aria-label={`${t("play")}`}
          title={`${t("play")}`}
          className="play-button"
          variant={variant}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default PlayButton;
