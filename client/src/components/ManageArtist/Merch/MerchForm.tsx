import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";
import Button from "components/common/Button";
import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";
import FormComponent from "components/common/FormComponent";
import { css } from "@emotion/css";
import FormError from "components/common/FormError";
import { QUERY_KEY_MERCH } from "queries/queryKeys";
import SelectTrackGroup from "./SelectTrackGroup";
import { useQueryClient } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";

const MerchForm: React.FC<{
  merch: Merch;
  artist: Artist;
  reload: () => void;
}> = ({ merch, artist, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);

  const client = useQueryClient();

  const methods = useForm<{
    title: string;
    description: string;
    minPrice: string;
    quantityRemaining: number;
  }>();
  const {
    handleSubmit,
    formState: { errors },
  } = methods;
  const { user } = useAuthContext();
  const userId = user?.id;

  React.useEffect(() => {
    const defaultValues = {
      ...merch,
      minPrice: `${merch?.minPrice !== undefined ? merch.minPrice / 100 : ""}`,
    };
    methods.reset(defaultValues);
  }, [merch]);

  const artistId = artist?.id;
  const trackGroupId = merch?.id;

  const doSave = React.useCallback(async () => {
    if (userId) {
      try {
        setIsSaving(true);

        const timeout = setTimeout(() => {
          client.invalidateQueries({
            predicate: (query) => {
              const shouldInvalidate = query.queryKey.find((obj) => {
                if (typeof obj === "string") {
                  return obj
                    .toLowerCase()
                    .includes(QUERY_KEY_MERCH.toLowerCase());
                }
                return false;
              });

              return !!shouldInvalidate;
            },
          });

          snackbar(t("merchUpdated"), {
            type: "success",
          });
        }, 2000);
        return () => {
          clearTimeout(timeout);
        };
      } catch (e) {
        errorHandler(e);
      } finally {
        setIsSaving(false);
        await reload();
      }
    }
  }, [t, userId, trackGroupId, snackbar, artistId, errorHandler, reload]);

  const isDisabled = isSaving;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(doSave)}
        className={css`
          width: 100%;
        `}
      >
        <FormComponent>
          <label>{t("merchTitle")}</label>
          <SavingInput
            formKey="title"
            url={`manage/merch/${merch.id}`}
            extraData={{}}
          />
        </FormComponent>
        <FormComponent>
          <label>{t("merchDescription")}</label>
          <SavingInput
            formKey="description"
            rows={3}
            url={`manage/merch/${merch.id}`}
            extraData={{}}
          />
        </FormComponent>
        <FormComponent>
          <label>{t("price")}</label>
          <SavingInput
            formKey="minPrice"
            type="number"
            step="0.01"
            min={0}
            url={`manage/merch/${merch.id}`}
            extraData={{}}
          />
          {errors.minPrice && <FormError>{t("priceZeroOrMore")}</FormError>}
        </FormComponent>

        <FormComponent>
          <label>{t("quantity")}</label>
          <SavingInput
            formKey="quantityRemaining"
            type="number"
            step="1"
            min={0}
            url={`manage/merch/${merch.id}`}
            extraData={{}}
          />
        </FormComponent>

        <SelectTrackGroup merch={merch} reload={reload} />
        <ArtistButton
          size="big"
          rounded
          type="submit"
          disabled={isDisabled}
          isLoading={isDisabled}
        >
          {t("saveMerch")}
        </ArtistButton>
      </form>
    </FormProvider>
  );
};

export default MerchForm;
