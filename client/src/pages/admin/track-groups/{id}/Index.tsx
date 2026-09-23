import Button from "components/common/Button";
import FormCheckbox from "components/common/FormCheckbox";
import FormComponent from "components/common/FormComponent";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

interface TrackGroupFormData {
  coverFile: File[];
  title: string;
  enabled: boolean;
  id: number;
  releaseDate: string;
  about: string;
  artistId: number;
  cover: { id: string; url: string[] };
}

export const Index: React.FC = () => {
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
        {t("trackGroup")} {trackgroup?.title}
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

export default Index;
