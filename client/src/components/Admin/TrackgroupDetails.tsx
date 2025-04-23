import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import { SelectEl } from "components/common/Select";
import TextArea from "components/common/TextArea";
import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useTranslation } from "react-i18next";
import FormCheckbox from "components/common/FormCheckbox";

interface TrackGroupFormData {
  coverFile: File[];
  title: string;
  published: boolean;
  enabled: boolean;
  id: number;
  releaseDate: string;
  about: string;
  artistId: number;
  cover: { id: string; url: string[] };
}

export const TrackGroupDetails: React.FC = () => {
  const { trackgroupId } = useParams();
  const snackbar = useSnackbar();
  const { register, handleSubmit, reset } = useForm<TrackGroupFormData>();
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const [trackgroup, setTrackgroup] = React.useState<TrackGroup>();

  const fetchTrackWrapper = React.useCallback(
    async (id: string) => {
      const { result } = await api.get<TrackGroup>(`trackGroups/${id}`);
      setTrackgroup(result);
      reset({
        ...result,
      });
    },
    [reset]
  );

  React.useEffect(() => {
    if (trackgroupId) {
      fetchTrackWrapper(trackgroupId);
    }
  }, [fetchTrackWrapper, trackgroupId]);

  const doSave = React.useCallback(
    async (data: TrackGroupFormData) => {
      if (trackgroupId) {
        try {
          setIsLoading(true);
          await api.put<TrackGroupFormData, TrackGroup>(
            `trackGroups/${trackgroupId}`,
            data
          );
          if (data.coverFile[0] && typeof data.coverFile[0] !== "string") {
            await api.uploadFile(
              `trackGroups/${trackgroupId}/cover`,
              data.coverFile
            );
          }
          snackbar("Successfully updated track group", { type: "success" });
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [trackgroupId, snackbar]
  );

  return (
    <>
      <h3>
        {t("trackgroup")} {trackgroup?.title}
      </h3>
      <form onSubmit={handleSubmit(doSave)}>
        <FormComponent>
          {t("title")} <InputEl {...register("title")} />
        </FormComponent>
        <FormComponent>
          {t("releaseDate")}{" "}
          <InputEl type="date" {...register("releaseDate")} />
        </FormComponent>
        <FormComponent>
          {t("about")} <TextArea {...register("about")} />
        </FormComponent>
        <FormComponent style={{ display: "flex" }}>
          <FormCheckbox keyName="published" description={t("isPrivate")} />
        </FormComponent>
        <FormComponent style={{ display: "flex" }}>
          <FormCheckbox keyName="enabled" description={t("isEnabled")} />
        </FormComponent>

        <Button
          type="submit"
          style={{ marginTop: "1rem" }}
          disabled={isLoading}
          isLoading={isLoading}
        >
          {t("saveTrackGroupButton")}
        </Button>
      </form>
    </>
  );
};

export default TrackGroupDetails;
