import React from "react";
import IconButton from "components/common/IconButton";
import { useForm, FormProvider } from "react-hook-form";
import { InputEl } from "components/common/Input";
import { FaEllipsisV, FaSave, FaTimes, FaUpload } from "react-icons/fa";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import Tooltip from "components/common/Tooltip";
import { fmtMSS } from "utils/tracks";
import SelectTrackPreview from "./SelectTrackPreview";
import TrackUploadingState from "./TrackUploadingState";
import ManageTrackArtists from "./ManageTrackArtists";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import useJobStatusCheck from "utils/useJobStatusCheck";
import LoadingSpinner from "components/common/LoadingSpinner";

interface FormData {
  title: string;
  status: "preview" | "must-own";
  trackFile: FileList;
  trackArtists: { artistName: string; artistRole: string; artistId: number }[];
}

const EditTrackRow: React.FC<{
  track: Track;
  onCancelEditing: () => void;
}> = ({ track, onCancelEditing: cancelEditing }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const [showMoreDetails, setShowMoreDetails] = React.useState(false);
  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: cancelEditing,
  });

  const methods = useForm<FormData>({
    defaultValues: {
      title: track.title,
      status: track.isPreview ? "preview" : "must-own",
      trackArtists: track.trackArtists,
    },
  });
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;
  const snackbar = useSnackbar();
  const trackId = track.id;
  const { register, reset } = methods;

  const onCancelEditing = React.useCallback(() => {
    reset({
      title: track.title,
      status: track.isPreview ? "preview" : "must-own",
      trackArtists: track.trackArtists,
    });
    cancelEditing();
  }, [reset, track, cancelEditing]);

  const onSave = React.useCallback(
    async (formData: FormData) => {
      try {
        setIsSaving(true);
        const packet = {
          title: formData.title,
          isPreview: formData.status === "preview",
          trackArtists: formData.trackArtists.map((a) => ({
            ...a,
            artistId:
              a.artistId && isFinite(+a.artistId) ? +a.artistId : undefined,
          })),
        };

        await api.put<Partial<Track>, { track: Track }>(
          `users/${userId}/tracks/${trackId}`,
          packet
        );

        if (formData.trackFile.length > 0) {
          const jobInfo = await api.uploadFile(
            `users/${userId}/tracks/${trackId}/audio`,
            [formData.trackFile[0]]
          );
          const jobId = jobInfo.result.jobId;
          setUploadJobs([{ jobId, jobStatus: "waiting" }]);
        } else {
          onCancelEditing();
        }
        snackbar(t("updatedTrack"), { type: "success" });
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    },
    [onCancelEditing, setUploadJobs, snackbar, t, trackId, userId]
  );

  const uploadingState = uploadJobs?.[0]?.jobStatus;
  let isDisabled = !!(uploadingState || uploadJobs.length > 0);

  return (
    <FormProvider {...methods}>
      <tr
        className={css`
          ${isDisabled || isSaving
            ? `
            opacity: .4;
            pointer-events: none;
            `
            : ""}
        `}
      >
        <td>
          {isSaving && <LoadingSpinner />}

          {!uploadingState && !isSaving && (
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
          )}
          {!isSaving && <TrackUploadingState uploadingState={uploadingState} />}
        </td>
        <td>
          <InputEl {...register(`title`)} disabled={isSaving || isDisabled} />
        </td>
        <td>
          <ManageTrackArtists trackArtistsKey={`trackArtists`} />
        </td>
        <td>
          <SelectTrackPreview statusKey="status" />
        </td>
        <td className="alignRight">
          {track.audio?.duration && fmtMSS(+track.audio.duration)}
        </td>
        <td className="alignRight">
          <IconButton
            compact
            onClick={onCancelEditing}
            type="button"
            disabled={isSaving || isDisabled}
            style={{ marginRight: ".25rem" }}
          >
            <FaTimes />
          </IconButton>
          <IconButton
            compact
            disabled={isSaving || isDisabled}
            onClick={methods.handleSubmit(onSave)}
            type="button"
            style={{ marginRight: ".25rem" }}
          >
            <FaSave />
          </IconButton>
          <Tooltip hoverText={t("moreTrackDetails")} underline={false}>
            <IconButton
              disabled={isSaving || isDisabled}
              compact
              onClick={() => setShowMoreDetails((val) => !val)}
              type="button"
            >
              <FaEllipsisV />
            </IconButton>
          </Tooltip>
        </td>
      </tr>
      {showMoreDetails && (
        <tr>
          <td colSpan={99}>
            <div
              className={css`
                max-width: 600px;
                max-height: 200px;
                overflow: scroll;
              `}
            >
              <strong>raw id3 tag: </strong>
              {JSON.stringify(track.metadata, null, 2)}
            </div>
          </td>
        </tr>
      )}
    </FormProvider>
  );
};

export default EditTrackRow;
