import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

const SetEntireCataloguePrice: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [price, setPrice] = useState("");
  const { data: artist } = useManagedArtistQuery();
  const snackbar = useSnackbar();

  const showModal = () => {
    setIsModalVisible(true);
  };

  React.useEffect(() => {
    if (artist) {
      setPrice(
        artist?.purchaseEntireCatalogMinPrice
          ? (artist?.purchaseEntireCatalogMinPrice / 100).toString()
          : ""
      );
    }
  }, [artist]);

  const handleOk = React.useCallback(async () => {
    if (!artist) return;
    try {
      await api.put(`manage/artists/${artist?.id}`, {
        purchaseEntireCatalogMinPrice: Number(price) * 100,
      });
      snackbar("Catalogue price saved!", { type: "success" });
    } catch (error) {
      console.error("Error updating price:", error);
    }
    setIsModalVisible(false);
  }, [artist, price]);

  const handlePriceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
  };

  return (
    <div>
      <ArtistButton onClick={showModal} size="compact" variant="outlined">
        {t("setEntireCataloguePrice")}
      </ArtistButton>
      <Modal
        title={t("setPriceTitle")}
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      >
        <form>
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {t("setEntireCataloguePriceDescription")}
          </p>
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {t("setEntireCataloguePriceDisclaimer")}
          </p>
          <div
            className={css`
              display: flex;
              align-items: flex-end;
              gap: 1rem;

              margin-bottom: 1rem;

              input {
                margin-bottom: 0 !important;
              }
              > div {
                margin-bottom: 0;
              }
            `}
          >
            <FormComponent>
              <InputEl
                type="number"
                value={price}
                onChange={handlePriceChange}
                placeholder="Enter price"
              />
            </FormComponent>
            <ArtistButton type="button" onClick={handleOk}>
              {t("save")}
            </ArtistButton>
          </div>
          <small>{t("zeroForNone")}</small>
        </form>
      </Modal>
    </div>
  );
};

export default SetEntireCataloguePrice;
