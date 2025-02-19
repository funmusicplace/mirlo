import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { InputEl } from "components/common/Input";
import { FaSave, FaTimes } from "react-icons/fa";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { fmtMSS } from "utils/tracks";
import SelectTrackPreview from "../SelectTrackPreview";
import TrackUploadingState from "../TrackUploadingState";
import ManageTrackArtists from "../ManageTrackArtists";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import useJobStatusCheck from "utils/useJobStatusCheck";
import LoadingSpinner from "components/common/LoadingSpinner";
import Button from "components/common/Button";
import { useAuthContext } from "state/AuthContext";
import ManageTrackLicense from "../ManageTrackLicense";
import ReplaceTrackAudioInput from "./ReplaceTrackAudioInput";
import TextArea from "components/common/TextArea";
import FormComponent from "components/common/FormComponent";

export interface FormData {
  title: string;
  status: "preview" | "must-own";
  trackFile: FileList;
  licenseId: number;
  isrc: string;
  lyrics: string;
}

const EditTrackRow: React.FC<{
  track: Track;
  onCancelEditing: () => void;
  reload: () => void;
}> = ({ track, onCancelEditing: cancelEditing, reload }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: cancelEditing,
  });

  const methods = useForm<FormData>({
    defaultValues: {
      title: track.title,
      status: track.isPreview ? "preview" : "must-own",
      licenseId: track.licenseId,
      lyrics: track.lyrics,
      isrc: track.isrc,
    },
  });

  const { user } = useAuthContext();
  const userId = user?.id;
  const snackbar = useSnackbar();
  const trackId = track.id;
  const { register, reset } = methods;

  const onCancelEditing = React.useCallback(() => {
    reset({
      title: track.title,
      status: track.isPreview ? "preview" : "must-own",
      licenseId: track.licenseId,
      isrc: track.isrc,
      lyrics: track.lyrics,
    });
    cancelEditing();
  }, [reset, track, cancelEditing]);

  const onSave = React.useCallback(
    async (formData: FormData) => {
      try {
        setIsSaving(true);
        const packet = {
          title: formData.title,
          isrc: formData.isrc,
          lyrics: formData.lyrics,
          isPreview: formData.status === "preview",
          licenseId: formData.licenseId
            ? Number(formData.licenseId)
            : undefined,
        };

        await api.put<Partial<Track>, { track: Track }>(
          `manage/tracks/${trackId}`,
          packet
        );

        if (formData.trackFile.length > 0) {
          const jobInfo = await api.uploadFile(
            `manage/tracks/${trackId}/audio`,
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
        reload();
      }
    },
    [onCancelEditing, reload, setUploadJobs, snackbar, t, trackId, userId]
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
            <ReplaceTrackAudioInput
              trackId={trackId}
              isSaving={isSaving}
              isDisabled={isDisabled}
            />
          )}
          {!isSaving && <TrackUploadingState uploadingState={uploadingState} />}
        </td>
        <td>
          <InputEl {...register(`title`)} disabled={isSaving || isDisabled} />
        </td>
        <td>
          <ManageTrackArtists
            trackArtists={track.trackArtists ?? []}
            onSave={reload}
            trackId={track.id}
          />
        </td>
        <td>
          <SelectTrackPreview statusKey="status" />
        </td>
        <td className="alignRight">
          {track.audio?.duration && fmtMSS(+track.audio.duration)}
        </td>
        <td className="alignRight">
          <Button
            size="compact"
            onClick={onCancelEditing}
            type="button"
            title="Close"
            variant="dashed"
            startIcon={<FaTimes />}
            disabled={isSaving || isDisabled}
          />
          <Button
            size="compact"
            variant="dashed"
            startIcon={<FaSave />}
            disabled={isSaving || isDisabled}
            onClick={methods.handleSubmit(onSave)}
            type="button"
            className={css`
              ${methods.formState.isDirty
                ? `background-color: var(--mi-success-background-color) !important; 
                   color: var(--mi-white) !important;
                   border-color: var(--mi-white) !important;`
                : ""}
            `}
          />
        </td>
      </tr>
      <tr>
        <td colSpan={3}>
          <FormComponent>
            <label>{t("isrcCode")}</label>
            <InputEl {...register(`isrc`)} disabled={isSaving || isDisabled} />
          </FormComponent>
        </td>
        <td colSpan={3}>
          <label>{t("lyrics")}</label>
          <TextArea
            {...register("lyrics")}
            className={css`
              width: 100%;
            `}
          />
        </td>
      </tr>
      <tr>
        <td colSpan={2}>
          <ManageTrackLicense />
        </td>
        <td />
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
    </FormProvider>
  );
};

export default EditTrackRow;
