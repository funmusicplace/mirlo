import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface FormSettings {
  trackGroupId: number;
}

const Index = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const { register, handleSubmit } = useForm<FormSettings>();

  const triggerPledgeCollection = React.useCallback(
    async (data: Partial<FormSettings>) => {
      try {
        await api.post("admin/chargePledges", {
          trackGroupId: data.trackGroupId,
        });
        snackbar(t("pledgeCollectionTriggered"), { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [snackbar, t]
  );

  return (
    <form onSubmit={handleSubmit(triggerPledgeCollection)}>
      <h3>{t("fundraising")}</h3>
      <FormComponent>
        <label htmlFor="input-pledge-track-group-id">
          {t("pledgeCollectionTrackGroupId")}
        </label>
        <InputEl
          id="input-pledge-track-group-id"
          type="number"
          className="max-w-xs"
          {...register("trackGroupId")}
        />
      </FormComponent>
      <Button type="submit">{t("triggerPledgeCollection")}</Button>
    </form>
  );
};

export default Index;
