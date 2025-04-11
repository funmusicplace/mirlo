import Button from "components/common/Button";
import Money, {
  getCurrencySymbol,
  moneyDisplay,
} from "components/common/Money";
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
import { testOwnership } from "./utils";
import Box from "components/common/Box";

interface FormData {
  chosenPrice: string;
  userEmail: string;
}

const BuyTrackGroup: React.FC<{ trackGroup: TrackGroup; track?: Track }> = ({
  trackGroup,
  track,
}) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const minPrice = track?.minPrice ?? trackGroup.minPrice;
  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `${minPrice ? minPrice / 100 : ""}`,
      userEmail: "",
    },
    reValidateMode: "onBlur",
  });
  const { register, watch, handleSubmit, formState } = methods;
  const chosenPrice = watch("chosenPrice");

  const purchaseAlbum = React.useCallback(
    async (data: FormData) => {
      try {
        const alreadyOwns = await testOwnership(trackGroup.id, data.userEmail);
        const confirmed = alreadyOwns
          ? window.confirm(t("albumExists") ?? "")
          : true;

        if (confirmed) {
          const url = track
            ? `tracks/${track.id}/purchase`
            : `trackGroups/${trackGroup.id}/purchase`;
          const response = await api.post<{}, { redirectUrl: string }>(url, {
            price: data.chosenPrice
              ? Number(data.chosenPrice) * 100
              : undefined,
            email: data.userEmail,
          });
          window.location.assign(response.redirectUrl);
        }
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
      }
    },
    [snackbar, t, trackGroup.id, track]
  );

  const lessThan1 = !isFinite(+chosenPrice) ? true : Number(chosenPrice) < 1;

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();
  const purchaseText = isBeforeReleaseDate ? "preOrder" : "buy";

  return (
    <FormProvider {...methods}>
      {!!minPrice && minPrice > 0 && (
        <>
          {t("price")}{" "}
          <Money amount={minPrice / 100} currency={trackGroup.currency} />, or
        </>
      )}
      <form onSubmit={handleSubmit(purchaseAlbum)}>
        <FormComponent>
          {t("nameYourPrice", {
            currency: getCurrencySymbol(trackGroup.currency, undefined),
          })}
          <InputEl
            {...register("chosenPrice")}
            type="number"
            min={minPrice ? minPrice / 100 : 0}
            step="0.01"
          />
          {Number(chosenPrice) > (minPrice ?? 1) * 100 && (
            <Box variant="success">
              {t("thatsGenerous", {
                chosenPrice: moneyDisplay({
                  amount: chosenPrice,
                  currency: trackGroup.currency,
                }),
              })}
            </Box>
          )}
          <PlatformPercent
            percent={trackGroup.platformPercent}
            chosenPrice={chosenPrice}
            currency={trackGroup.currency}
            artist={trackGroup.artist}
          />
        </FormComponent>

        <EmailInput required />

        <Button
          size="big"
          rounded
          type="submit"
          disabled={!!lessThan1 || lessThanMin || !formState.isValid}
        >
          {t(purchaseText)}
        </Button>

        <div
          className={css`
            margin-top: 1rem;

            small {
              display: block;
              margin-bottom: 0.5rem;
            }
          `}
        >
          <small>{t("artistCheckoutPage")}</small>

          <small>{t("downloadDisclaimer")}</small>
        </div>
      </form>
      {!isBeforeReleaseDate && (
        <>
          {!!minPrice && lessThanMin && (
            <strong>
              {t("lessThanMin", {
                minPrice: moneyDisplay({
                  amount: minPrice / 100,
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
