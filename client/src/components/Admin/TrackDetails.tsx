import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import { SelectEl } from "components/common/Select";
import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";
// import { AdminTrack, fetchTrack, updateTrack } from "services/api/Admin";

export const TrackDetails: React.FC = () => {
  const { trackId } = useParams();
  const snackbar = useSnackbar();
  const { register, handleSubmit, reset } = useForm();
  const [isLoading, setIsLoading] = React.useState(false);
  const errorHandler = useErrorHandler();

  const [track, setTrack] = React.useState<Track>();

  const { t } = useTranslation("translation", { keyPrefix: "trackDetails" });

  const fetchTrackWrapper = React.useCallback(
    async (id: string) => {
      const { result } = await api.get<Track>(`tracks/${id}`);
      setTrack(result);
      reset({
        ...result,
      });
    },
    [reset]
  );

  React.useEffect(() => {
    if (trackId) {
      fetchTrackWrapper(trackId);
    }
  }, [fetchTrackWrapper, trackId]);

  const doSave = React.useCallback(
    async (data: unknown) => {
      if (trackId) {
        try {
          setIsLoading(true);
          await api.put<Track, Track>(`tracks/${trackId}`, data as Track);
          snackbar("sucessfullyUpdated", { type: "success" });
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [trackId, snackbar]
  );

  return (
    <>
      <h3>
        {t("track")} {track?.title}
      </h3>
      <form onSubmit={handleSubmit(doSave)}>
        <div>
          {t("saveTrackForm.title")} <InputEl {...register("title")} />
        </div>
        <div>
          {t("saveTrackForm.status")}
          <SelectEl defaultValue="paid" {...register("status")}>
            <option value="free+paid">
              {t("saveTrackForm.option.freePaid")}
            </option>
            <option value="hidden">{t("saveTrackForm.option.hidden")}</option>
            <option value="free">{t("saveTrackForm.option.free")}</option>
            <option value="paid">{t("saveTrackForm.option.paid")}</option>
            <option value="deleted">{t("saveTrackForm.option.deleted")}</option>
          </SelectEl>
        </div>

        <Button
          type="submit"
          style={{ marginTop: "1rem" }}
          disabled={isLoading}
          startIcon={isLoading ? <LoadingSpinner /> : undefined}
        >
          {t("saveButton")}
        </Button>
      </form>
    </>
  );
};

export default TrackDetails;
