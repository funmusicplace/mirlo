import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";
import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useTranslation } from "react-i18next";
import FormCheckbox from "components/common/FormCheckbox";
import useErrorHandler from "services/useErrorHandler";

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
  const { id } = useParams();
  const snackbar = useSnackbar();
  const methods = useForm<TrackGroupFormData>();
  const { register, handleSubmit, reset } = methods;
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation("translation", {
    keyPrefix: "admin",
  });
  const errorHandler = useErrorHandler();

  const [trackgroup, setTrackgroup] = React.useState<TrackGroup>();

  const fetchTrackWrapper = React.useCallback(
    async (id: string) => {
      const { result } = await api.get<TrackGroup>(`trackGroups/${id}`);
      setTrackgroup(result);
      console.log(result);
      reset({
        ...result,
      });
    },
    [reset]
  );

  React.useEffect(() => {
    if (id) {
      fetchTrackWrapper(id);
    }
  }, [fetchTrackWrapper, id]);

  const doSave = React.useCallback(
    async (data: TrackGroupFormData) => {
      if (id) {
        try {
          setIsLoading(true);
          await api.put<TrackGroupFormData, TrackGroup>(
            `admin/trackGroups/${id}`,
            data
          );
          snackbar("Successfully updated track group", { type: "success" });
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [id, errorHandler, snackbar]
  );

  return (
    <FormProvider {...methods}>
      <h3>
        {t("trackgroup")} {trackgroup?.title}
      </h3>
      <form onSubmit={handleSubmit(doSave)}>
        <FormComponent style={{ display: "flex" }}>
          <FormCheckbox keyName="adminEnabled" description={t("isEnabled")} />
        </FormComponent>
        <FormComponent style={{ display: "flex" }}>
          <FormCheckbox
            keyName="hideFromSearch"
            description={t("hideFromSearch")}
          />
        </FormComponent>
        <Button
          type="submit"
          style={{ marginTop: "1rem" }}
          disabled={isLoading}
          isLoading={isLoading}
        >
          {t("save")}
        </Button>
      </form>
    </FormProvider>
  );
};

export default TrackGroupDetails;
