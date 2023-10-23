import Button from "components/common/Button";
import Money from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { Input } from "components/common/Input";

const BuyTrackGroup: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const [chosenPrice, setChosenPrice] = React.useState(
    `${trackGroup.minPrice ? trackGroup.minPrice / 100 : 5}`
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

  return (
    <>
      {trackGroup.minPrice && (
        <>
          Price: <Money amount={trackGroup.minPrice / 100} />, or
        </>
      )}
      <div>
        Name your price in USD:
        <Input
          value={chosenPrice}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setChosenPrice(e.target.value);
          }}
          name="price"
        />
      </div>
      <Button onClick={purchaseAlbum}>{t("buy")}</Button>
    </>
  );
};

export default BuyTrackGroup;
