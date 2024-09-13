import React from "react";
import { useTranslation } from "react-i18next";

import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { useFormContext } from "react-hook-form";
import { useAuthContext } from "state/AuthContext";

const EmailInput: React.FC<{ required?: boolean }> = ({ required }) => {
  const { user } = useAuthContext();
  const { register } = useFormContext();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  if (user) {
    return null;
  }

  return (
    <FormComponent>
      {t("email")}
      <InputEl
        {...register("userEmail", {
          required,
          pattern: {
            value: /\S+@\S+\.\S+/,
            message: "Entered value does not match email format",
          },
        })}
        type="email"
        required
      />
      <small>{t("notLoggedIn")}</small>
    </FormComponent>
  );
};

export default EmailInput;
