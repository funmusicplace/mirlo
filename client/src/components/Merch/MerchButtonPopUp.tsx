import { css } from "@emotion/css";

import { useTranslation } from "react-i18next";

import BuyMerchItem from "./BuyMerchItem";
import Button from "components/common/Button";

import { moneyDisplay } from "components/common/Money";
import Modal from "components/common/Modal";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { queryUserStripeStatus } from "queries";

const MerchButtonPopUp: React.FC<{ merch: Merch; artist: Artist }> = ({
  merch,
  artist,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const [isOpen, setIsOpen] = React.useState(false);

  if (!stripeAccountStatus?.chargesEnabled || merch.quantityRemaining === 0) {
    return null;
  }

  const hasPricedOptions = merch.optionTypes.find((ot) =>
    ot.options.find((o) => o.additionalPrice)
  );

  const amount = moneyDisplay({
    amount: merch.minPrice / 100,
    currency: merch.currency,
  });

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        {hasPricedOptions
          ? t("buyFrom", { amount })
          : t("buyFor", {
              amount,
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
