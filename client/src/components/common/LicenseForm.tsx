import React from "react";
import Button from "./Button";
import { InputEl } from "./Input";
import { useForm } from "react-hook-form";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import FormComponent from "./FormComponent";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";

interface FormData {
  short: string;
  link?: string;
  name: string;
}

const LicenseForm: React.FC<{ callback: () => void }> = ({ callback }) => {
  const methods = useForm<FormData>();
  const errorHandler = useErrorHandler();
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageLicense" });

  const onSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await api.post(`licenses`, data);
        await callback();
        snackbar(t("licenseAdded"));
      } catch (e) {
        errorHandler(e);
      }
    },
    [errorHandler, snackbar, t, callback]
  );

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <FormComponent>
        <label>{t("shortLabelForLicense")}</label>
        <InputEl
          {...methods.register("short")}
          placeholder={t("egShort") ?? ""}
        />{" "}
      </FormComponent>
      <FormComponent>
        <label>{t("longLabel")}</label>
        <InputEl
          {...methods.register("name")}
          placeholder={t("egLong") ?? ""}
        />{" "}
      </FormComponent>
      <FormComponent>
        <label>{t("urlForLabel")}</label>
        <InputEl
          {...methods.register("link")}
          placeholder={t("egLink") ?? ""}
        />{" "}
      </FormComponent>
      <Button>{"add"}</Button>
    </form>
  );
};

export default LicenseForm;
