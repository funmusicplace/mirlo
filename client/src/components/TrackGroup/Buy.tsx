import Button from "components/common/Button";
import Money, { moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { Input } from "components/common/Input";
import FormComponent from "components/common/FormComponent";

const BuyTrackGroup: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const minPrice = trackGroup.minPrice;
  const [email, setEmail] = React.useState("");
  const [chosenPrice, setChosenPrice] = React.useState(
    `${minPrice ? minPrice / 100 : 5}`
  );
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const purchaseAlbum = React.useCallback(async () => {
    try {
      const response = await api.post<{}, { sessionUrl: string }>(
        `trackGroups/${trackGroup.id}/purchase`,
        { price: chosenPrice ? Number(chosenPrice) * 100 : undefined }
      );
      window.location.assign(response.sessionUrl);
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  }, [chosenPrice, snackbar, t, trackGroup.id]);

  const downloadAlbumAnyway = React.useCallback(async () => {
    try {
      await api.post<{}, { sessionUrl: string }>(
        `trackGroups/${trackGroup.id}/freeDownload`,
        { email }
      );
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  }, [email, snackbar, t, trackGroup.id]);

  const lessThan1 = Number.isNaN(Number(chosenPrice))
    ? true
    : Number(chosenPrice) < 1;

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin = Number.isNaN(Number(chosenPrice))
      ? false
      : Number(chosenPrice) < minPrice / 100;
  }

  return (
    <>
      {trackGroup.minPrice && (
        <>
          {t("price")} <Money amount={trackGroup.minPrice / 100} />, or
        </>
      )}
      <div>
        {t("nameYourPrice")}
        <Input
          value={chosenPrice}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setChosenPrice(e.target.value);
          }}
          name="price"
          min={trackGroup.minPrice}
        />
      </div>
      <Button onClick={purchaseAlbum} disabled={!!lessThan1 || lessThanMin}>
        {t("buy")}
      </Button>
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
      {lessThan1 && (
        <div style={{ marginTop: "1rem" }}>
          <strong>
            {t("moreThan1", {
              currency: trackGroup.currency,
              artistName: trackGroup.artist?.name,
            })}
          </strong>
          <form style={{ marginTop: "1rem" }}>
            <p style={{ marginBottom: "1rem" }}>{t("justDownload")}</p>
            <FormComponent>
              {t("email")}
              <Input
                name="email"
                type="email"
                required
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value);
                }}
              />
            </FormComponent>
            <Button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                downloadAlbumAnyway();
                console.log("submitting");
              }}
            >
              {t("getDownloadLink")}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default BuyTrackGroup;
