import Button from "components/common/Button";
import Money, { moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { Input } from "components/common/Input";
import FreeDownload from "./FreeDownload";
import { useGlobalStateContext } from "state/GlobalState";
import FormComponent from "components/common/FormComponent";

const BuyTrackGroup: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const minPrice = trackGroup.minPrice;
  const [chosenPrice, setChosenPrice] = React.useState(
    `${minPrice ? minPrice / 100 : 5}`
  );
  const [email, setEmail] = React.useState("");
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const purchaseAlbum = React.useCallback(
    async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault();
      try {
        const response = await api.post<{}, { sessionUrl: string }>(
          `trackGroups/${trackGroup.id}/purchase`,
          { price: chosenPrice ? Number(chosenPrice) * 100 : undefined, email }
        );
        window.location.assign(response.sessionUrl);
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
      }
    },
    [chosenPrice, email, snackbar, t, trackGroup.id]
  );

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
      <form>
        <FormComponent>
          {t("nameYourPrice")}
          <Input
            value={chosenPrice}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setChosenPrice(e.target.value);
            }}
            name="price"
            min={trackGroup.minPrice}
          />
        </FormComponent>
        {!user && (
          <FormComponent>
            {t("email")}
            <Input
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
              }}
              name="email"
              type="email"
              required
            />
          </FormComponent>
        )}
        <Button
          onClick={purchaseAlbum}
          type="submit"
          disabled={!!lessThan1 || lessThanMin || (!user && email === "")}
        >
          {t("buy")}
        </Button>
      </form>
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
  );
};

export default BuyTrackGroup;
