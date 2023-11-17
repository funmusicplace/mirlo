import React from "react";
import { useTranslation } from "react-i18next";

import { InputEl } from "components/common/Input";
import { useGlobalStateContext } from "state/GlobalState";
import FormComponent from "components/common/FormComponent";
import { useFormContext } from "react-hook-form";

const EmailInput: React.FC<{ trackGroupId: number }> = ({ trackGroupId }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { register } = useFormContext();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  if (user) {
    return null;
  }

  return (
    <FormComponent>
      {t("email")}
      <InputEl {...register("userEmail")} type="email" />
      <small>{t("notLoggedIn")}</small>
    </FormComponent>
  );
};

export default EmailInput;
