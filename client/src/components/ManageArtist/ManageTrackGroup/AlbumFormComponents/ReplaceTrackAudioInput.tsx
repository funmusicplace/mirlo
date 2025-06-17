import Tooltip from "components/common/Tooltip";
import { css } from "@emotion/css";
import { FaUpload } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useForm, useFormContext } from "react-hook-form";
import React from "react";
import useJobStatusCheck from "utils/useJobStatusCheck";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import LoadingSpinner from "components/common/LoadingSpinner";
export interface FormData {
  trackFile: FileList;
}

const ReplaceTrackAudioInput: React.FC<{
  trackId: number;
  isDisabled?: boolean;
  reload: () => void;
}> = ({ trackId, isDisabled }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();

  const { register, getValues } = useForm<FormData>({
    mode: "onChange",
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const { setUploadJobs } = useJobStatusCheck({
    reload: () => {
      snackbar(t("updatedTrack"), { type: "success" });
      setIsSaving(false);
    },
  });

  const onSave = React.useCallback(async () => {
    try {
      setIsSaving(true);
      const formData = getValues();
      if (formData.trackFile.length > 0) {
        const jobInfo = await api.uploadFile(`manage/tracks/${trackId}/audio`, [
          formData.trackFile[0],
        ]);
        const jobId = jobInfo.result.jobId;
        setUploadJobs([{ jobId, jobStatus: "waiting" }]);
      } else {
      }
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  }, [setUploadJobs, snackbar, t, trackId]);

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
          border-radius: var(--mi-border-radius);
        `}
      >
        {isSaving && <LoadingSpinner />}
        {!isSaving && <FaUpload />}
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
          {...register("trackFile", {
            onChange: onSave,
          })}
          accept="audio/mpeg,audio/flac,audio/wav,audio/x-flac,audio/aac,audio/aiff,audio/x-m4a"
        />
      </label>
    </Tooltip>
  );
};

export default ReplaceTrackAudioInput;
