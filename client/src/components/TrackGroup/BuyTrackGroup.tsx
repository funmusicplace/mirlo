import Button from "components/common/Button";
import Money, { moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { InputEl } from "components/common/Input";
import FreeDownload from "./FreeDownload";
import FormComponent from "components/common/FormComponent";
import { FormProvider, useForm } from "react-hook-form";
import EmailInput from "./EmailInput";
import PlatformPercent from "components/common/PlatformPercent";
import { css } from "@emotion/css";

interface FormData {
  chosenPrice: string;
  userEmail: string;
}

const testOwnership = async (trackGroupId: number, email: string) => {
  try {
    const response = await api.get<{ exists: boolean }>(
      `trackGroups/${trackGroupId}/testOwns?email=${email.toLowerCase()}`
    );
    return response.result.exists;
  } catch (e) {
    return false;
  }
};

const BuyTrackGroup: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const minPrice = trackGroup.minPrice;
  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `${minPrice ? minPrice / 100 : 5}`,
      userEmail: "",
    },
    reValidateMode: "onBlur",
  });
  const { register, watch, handleSubmit, formState } = methods;
  const chosenPrice = watch("chosenPrice");

  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const purchaseAlbum = React.useCallback(
    async (data: FormData) => {
      try {
        const alreadyOwns = await testOwnership(trackGroup.id, data.userEmail);
        const confirmed = alreadyOwns
          ? window.confirm(t("albumExists") ?? "")
          : true;

        if (confirmed) {
          const response = await api.post<{}, { sessionUrl: string }>(
            `trackGroups/${trackGroup.id}/purchase`,
            {
              price: data.chosenPrice
                ? Number(data.chosenPrice) * 100
                : undefined,
              email: data.userEmail,
            }
          );
          window.location.assign(response.sessionUrl);
        }
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
      }
    },
    [snackbar, t, trackGroup.id]
  );

  const lessThan1 = !isFinite(+chosenPrice) ? true : Number(chosenPrice) < 1;

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin = isFinite(+chosenPrice)
      ? false
      : Number(chosenPrice) < minPrice / 100;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();
  const purchaseText = isBeforeReleaseDate ? "preOrder" : "buy";

  return (
    <FormProvider {...methods}>
      {trackGroup.minPrice && (
        <>
          {t("price")} <Money amount={trackGroup.minPrice / 100} />, or
        </>
      )}
      <form onSubmit={handleSubmit(purchaseAlbum)}>
        <FormComponent>
          {t("nameYourPrice")}
          <InputEl
            {...register("chosenPrice")}
            type="number"
            min={trackGroup.minPrice ? trackGroup.minPrice / 100 : 0}
          />
        </FormComponent>
        <PlatformPercent
          percent={trackGroup.platformPercent}
          chosenPrice={chosenPrice}
        />
        <EmailInput />
        <Button
          type="submit"
          disabled={!!lessThan1 || lessThanMin || !formState.isValid}
        >
          {t(purchaseText)}
        </Button>
        <p
          className={css`
            margin-top: 1rem;
          `}
        >
          <small>{t("downloadDisclaimer")}</small>
        </p>
      </form>
      {!isBeforeReleaseDate && (
        <>
          {trackGroup.minPrice && lessThanMin && (
            <strong>
              {t("lessThanMin", {
                minPrice: moneyDisplay({
                  amount: trackGroup.minPrice / 100,
                  currency: trackGroup.currency,
                }),
                artistName: trackGroup.artist?.name,
              })}
            </strong>
          )}
          <FreeDownload trackGroup={trackGroup} chosenPrice={chosenPrice} />
        </>
      )}
    </FormProvider>
  );
};

export default BuyTrackGroup;
