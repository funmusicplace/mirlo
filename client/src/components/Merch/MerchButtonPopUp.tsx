import { css } from "@emotion/css";

import { useTranslation } from "react-i18next";

import BuyMerchItem from "./BuyMerchItem";
import Button from "components/common/Button";

import { moneyDisplay } from "components/common/Money";
import Modal from "components/common/Modal";
import React from "react";

const MerchButtonPopUp: React.FC<{ merch: Merch; artist: Artist }> = ({
  merch,
  artist,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        {t("buyFor", {
          amount: moneyDisplay({
            amount: merch.minPrice / 100,
            currency: merch.currency,
          }),
        })}
      </Button>
      <Modal
        open={isOpen}
        size="small"
        title={t("buyMerch")}
        onClose={() => setIsOpen(false)}
        className={css`
          form {
            max-width: 100%;
            background-color: transparent;
          }
        `}
      >
        <BuyMerchItem artist={artist} merch={merch} />
      </Modal>
    </>
  );
};

export default MerchButtonPopUp;
