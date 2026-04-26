import { useGetArtistColors } from "components/Artist/ArtistButtons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { moneyDisplay } from "./Money";

const PlatformPercent: React.FC<{
  percent: number;
  chosenPrice?: string | number;
  currency: string;
  artistName?: string;
  alignRight?: boolean;
}> = ({
  percent,
  chosenPrice,
  currency = "USD",
  artistName,
  alignRight = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = `platform-percent-tooltip-${Math.random().toString(36).substr(2, 9)}`;
  const { colors } = useGetArtistColors();
  const chosenNumber =
    chosenPrice && isFinite(+chosenPrice) ? Number(chosenPrice) : null;
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!chosenNumber) {
    return null;
  }

  const amount = (chosenNumber * (100 - percent)) / 100;
  const paymentAmount = chosenNumber * 0.029 + 0.3;

  return (
    <div className="relative inline-block">
      <button
        id={`${tooltipId}-button`}
        className="w-6 h-6 border-1 rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer p-0 transition-opacity hover:opacity-80"
        style={{
          borderColor: colors?.button ?? "var(--mi-primary-color)",
          color: colors?.button ?? "var(--mi-primary-color)",
        }}
        onClick={() => setShowTooltip(!showTooltip)}
        type="button"
        aria-label={t("helpTooltip") || "Platform percentage information"}
        aria-expanded={showTooltip}
        aria-describedby={showTooltip ? tooltipId : undefined}
      >
        ?
      </button>
      {showTooltip && (
        <div
          id={tooltipId}
          className={`absolute z-10 rounded shadow p-3 text-sm whitespace-normal w-64 top-8 border ${
            alignRight ? "right-0" : "left-0"
          }`}
          role="tooltip"
          style={{
            backgroundColor:
              colors?.background ?? "var(--mi-normal-background-color)",
            borderColor: colors?.button ?? "var(--mi-primary-color)",
            color: colors?.text ?? "var(--mi-foreground-color)",
          }}
        >
          {t("platformPercent", {
            percent: (100 - percent).toFixed(),
            artistName: artistName ?? "the artist",
            money: moneyDisplay({ amount, currency }),
            mirloCut: moneyDisplay({
              amount: Number(chosenPrice) - amount,
              currency,
            }),
            paymentProcessorCut: moneyDisplay({
              amount: paymentAmount,
              currency,
            }),
          })}
        </div>
      )}
    </div>
  );
};

export default PlatformPercent;
