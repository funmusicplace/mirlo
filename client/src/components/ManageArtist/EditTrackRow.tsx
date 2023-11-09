import React from "react";
import IconButton from "components/common/IconButton";
import { useForm, FormProvider } from "react-hook-form";
import { InputEl } from "components/common/Input";
import { FaEllipsisV, FaSave, FaTimes } from "react-icons/fa";
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

interface FormData {
  title: string;
  status: "preview" | "must-own";
  trackArtists: { artistName: string; artistRole: string; artistId: number }[];
}

const EditTrackRow: React.FC<{
  track: Track;
  uploadingState?: string;
  isSaving?: boolean;
  onCancelEditing: () => void;
}> = ({ track, uploadingState, isSaving, onCancelEditing: cancelEditing }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const [showMoreDetails, setShowMoreDetails] = React.useState(false);
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
      console.log("formData", formData);
      try {
        const packet = {
          title: formData.title,
          isPreview: formData.status === "preview",
          trackArtists: formData.trackArtists.map((a) => ({
            ...a,
            artistId:
              a.artistId && isFinite(+a.artistId) ? +a.artistId : undefined,
          })),
        };

        const result = await api.put<Partial<Track>, { track: Track }>(
          `users/${userId}/tracks/${trackId}`,
          packet
        );
        console.log("result", result);
        snackbar(t("updatedTrack"), { type: "success" });
        cancelEditing();
      } catch (e) {
        console.error(e);
      } finally {
      }
    },
    [cancelEditing, snackbar, t, trackId, userId]
  );

  return (
    <FormProvider {...methods}>
      <tr
        className={css`
          ${uploadingState || isSaving
            ? `
            opacity: .4;
            pointer-events: none;
            `
            : ""}
        `}
      >
        <td>
          <TrackUploadingState uploadingState={uploadingState} />
        </td>
        <td>
          <InputEl {...register(`title`)} />
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
            style={{ marginRight: ".25rem" }}
          >
            <FaTimes />
          </IconButton>
          <IconButton
            compact
            onClick={methods.handleSubmit(onSave)}
            type="button"
            style={{ marginRight: ".25rem" }}
          >
            <FaSave />
          </IconButton>
          <Tooltip hoverText={t("moreTrackDetails")} underline={false}>
            <IconButton
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
