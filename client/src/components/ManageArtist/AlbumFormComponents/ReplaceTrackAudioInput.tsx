import Tooltip from "components/common/Tooltip";
import { css } from "@emotion/css";
import { FaUpload } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";

const ReplaceTrackAudioInput: React.FC<{
  trackId: number;
  isSaving: boolean;
  isDisabled: boolean;
}> = ({ trackId, isSaving, isDisabled }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const { register } = useFormContext();

  return (
    <Tooltip hoverText={t("replaceTrackAudio")}>
      <label
        htmlFor={`track.${trackId}`}
        className={css`
          width: 2rem;
          cursor: pointer;
          height: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--mi-darken-background-color);
          border-radius: var(--mi-border-radius);
        `}
      >
        <FaUpload />
        <input
          disabled={isSaving || isDisabled}
          type="file"
          className={css`
            display: none;

            &::file-selector-button {
              display: none;
            }
          `}
          placeholder="Replace"
          id={`track.${trackId}`}
          {...register("trackFile")}
          accept="audio/mpeg,audio/flac,audio/wav,audio/x-flac,audio/aac,audio/aiff,audio/x-m4a"
        />
      </label>
    </Tooltip>
  );
};

export default ReplaceTrackAudioInput;
