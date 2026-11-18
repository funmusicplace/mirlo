import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { stripeCurrencyCodes } from "utils/currencyCodes";

type Form = { currency: string };

const CurrencySelect = () => {
  const { user, refreshLoggedInUser } = useAuthContext();
  const userId = user?.id;

  const { t } = useTranslation("translation", { keyPrefix: "manage" });
  const snackbar = useSnackbar();

  const { register, handleSubmit } = useForm<Form>({
    defaultValues: {
      currency: user?.currency,
    },
  });

  const doSave = React.useCallback(
    async (data: Form) => {
      try {
        await api.put(`users/${userId}`, {
          currency: data.currency,
        });
        snackbar(t("success"), { type: "success" });
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
      } finally {
        refreshLoggedInUser();
      }
    },
    [refreshLoggedInUser, snackbar, t, userId]
  );

  return (
    <form onSubmit={handleSubmit(doSave)}>
      <FormComponent
        className={css`
          display: flex;

          button {
            height: 100%;
            margin: 0 0 0 0.5rem;
          }
          select {
            margin: 0 !important;
          }
        `}
      >
        <label>{t("countryCurrencyCode")} </label>
        <div
          className={css`
            display: flex;
            align-items: center;
            button {
              margin: 0 0 0 0.5rem;
            }
            select {
              margin: 0 !important;
            }
          `}
        >
          <SelectEl {...register("currency")}>
            {stripeCurrencyCodes.map((cc) => (
              <option value={cc.toLowerCase()} key={cc}>
                {cc}
              </option>
            ))}
          </SelectEl>
          <Button size="compact">{t("saveCountryCode")}</Button>
        </div>
      </FormComponent>
    </form>
  );
};

export default CurrencySelect;
