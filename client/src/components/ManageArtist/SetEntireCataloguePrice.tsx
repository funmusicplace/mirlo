import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { getCurrencySymbol } from "components/common/Money";
import { Select } from "components/common/Select";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaTag } from "react-icons/fa";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

type PricingMode = "fixed" | "percentage";

const SetEntireCataloguePrice: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [mode, setMode] = useState<PricingMode>("fixed");
  const [price, setPrice] = useState("");
  const [percentage, setPercentage] = useState("");
  const { data: artist } = useManagedArtistQuery();
  const snackbar = useSnackbar();

  const showModal = () => {
    setIsModalVisible(true);
  };

  React.useEffect(() => {
    if (artist) {
      setMode(
        artist?.purchaseEntireCatalogPercentage != null ? "percentage" : "fixed"
      );
      setPrice(
        artist?.purchaseEntireCatalogMinPrice
          ? (artist?.purchaseEntireCatalogMinPrice / 100).toString()
          : ""
      );
      setPercentage(
        artist?.purchaseEntireCatalogPercentage != null
          ? artist.purchaseEntireCatalogPercentage.toString()
          : ""
      );
    }
  }, [artist]);

  const handleOk = React.useCallback(async () => {
    if (!artist) return;
    try {
      if (mode === "percentage") {
        await api.put(`manage/artists/${artist?.id}`, {
          purchaseEntireCatalogPercentage: Number(percentage),
        });
      } else {
        await api.put(`manage/artists/${artist?.id}`, {
          purchaseEntireCatalogMinPrice: Number(price) * 100,
          purchaseEntireCatalogPercentage: null,
        });
      }
      snackbar(t("cataloguePriceSaved"), { type: "success" });
    } catch (error) {
      console.error("Error updating price:", error);
    }
    setIsModalVisible(false);
  }, [artist, mode, price, percentage]);

  const handlePriceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
  };

  const handlePercentageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPercentage(e.target.value);
  };

  return (
    <div>
      <ArtistButton
        onClick={showModal}
        size="compact"
        variant="dashed"
        collapsible
        startIcon={<FaTag />}
      >
        {t("setEntireCataloguePrice")}
      </ArtistButton>
      <Modal
        title={t("setPriceTitle")}
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      >
        <form>
          <p className="mb-4">{t("setEntireCataloguePriceDescription")}</p>
          <p className="mb-4">{t("setEntireCataloguePriceDisclaimer")}</p>
          <FormComponent>
            <label>{t("cataloguePricingMode")}</label>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as PricingMode)}
              options={[
                { value: "fixed", label: t("cataloguePricingModeFixed") },
                {
                  value: "percentage",
                  label: t("cataloguePricingModePercentage"),
                },
              ]}
            />
          </FormComponent>
          <div className="mb-4 flex items-end gap-4 [&_input]:!mb-0 [&>div]:mb-0">
            {mode === "fixed" && (
              <FormComponent>
                <div className="flex items-center gap-1">
                  {artist?.user?.currency && (
                    <span>{getCurrencySymbol(artist.user.currency)}</span>
                  )}
                  <InputEl
                    type="number"
                    value={price}
                    onChange={handlePriceChange}
                    placeholder={t("enterPrice") ?? undefined}
                  />
                </div>
              </FormComponent>
            )}
            {mode === "percentage" && (
              <FormComponent>
                <div className="flex items-center gap-1">
                  <InputEl
                    type="number"
                    min={0}
                    max={100}
                    value={percentage}
                    onChange={handlePercentageChange}
                    placeholder={t("enterPercentage") ?? undefined}
                  />
                  <span>%</span>
                </div>
              </FormComponent>
            )}
            <ArtistButton type="button" onClick={handleOk}>
              {t("save")}
            </ArtistButton>
          </div>
          {mode === "fixed" && <small>{t("zeroForNone")}</small>}
          {mode === "percentage" && (
            <small>{t("cataloguePricingPercentageDescription")}</small>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default SetEntireCataloguePrice;
