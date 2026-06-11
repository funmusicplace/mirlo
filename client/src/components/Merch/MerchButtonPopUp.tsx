import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";

import BuyMerchItem from "./BuyMerchItem";

const MerchButtonPopUp: React.FC<{
  merch: Merch;
  artist: Artist;
  compact?: boolean;
}> = ({ merch, artist, compact = false }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const hasExternalUrl = !!merch.externalUrl;

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const [isOpen, setIsOpen] = React.useState(false);

  if (merch.quantityRemaining === 0) {
    return <ArtistButton disabled>{t("soldOut")}</ArtistButton>;
  }

  // Externally-sold merch sidesteps Mirlo's Stripe checkout, so don't gate the
  // button on the artist's Stripe status. See #1424.
  if (!hasExternalUrl && !stripeAccountStatus?.chargesEnabled) {
    return <ArtistButton disabled>{t("soldOut")}</ArtistButton>;
  }

  const hasPricedOptions =
    merch.optionTypes?.find((ot) =>
      ot.options.find((o) => o.additionalPrice)
    ) || merch.shippingDestinations.find((sd) => sd.costUnit);

  const amount = moneyDisplay({
    amount: merch.minPrice / 100,
    currency: merch.currency,
  });

  const buttonLabel = hasExternalUrl
    ? t("buyOnExternalSite")
    : hasPricedOptions
      ? t("buyFrom", { amount })
      : t("buyFor", { amount });

  return (
    <>
      <ArtistButton
        wrap={compact}
        size={compact ? "compact" : undefined}
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </ArtistButton>
      <Modal
        open={isOpen}
        title={hasExternalUrl ? t("leavingMirloTitle") : t("buyMerch")}
        size={hasExternalUrl ? "small" : "medium"}
        noPadding={!hasExternalUrl}
        onClose={() => setIsOpen(false)}
        className={css`
          form {
            max-width: 100%;
            background-color: transparent;
          }
        `}
      >
        {hasExternalUrl ? (
          <div
            className={css`
              padding: 1rem;
            `}
          >
            <p>{t("leavingMirloWarning")}</p>
            <p
              className={css`
                margin-top: 0.5rem;
                word-break: break-all;
                opacity: 0.7;
                font-size: 0.875rem;
              `}
            >
              {merch.externalUrl}
            </p>
            <div
              className={css`
                margin-top: 1rem;
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
              `}
            >
              <ArtistButton onClick={() => setIsOpen(false)} variant="outlined">
                {t("cancel")}
              </ArtistButton>
              <ArtistButton
                onClick={() => {
                  if (merch.externalUrl) {
                    window.open(
                      merch.externalUrl,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }
                  setIsOpen(false);
                }}
              >
                {t("continueToExternalSite")}
              </ArtistButton>
            </div>
          </div>
        ) : (
          <BuyMerchItem artist={artist} merch={merch} />
        )}
      </Modal>
    </>
  );
};

export default MerchButtonPopUp;
