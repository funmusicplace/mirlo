import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { moneyDisplay } from "./Money";
import { useGetArtistColors } from "components/Artist/ArtistButtons";

const PlatformPercent: React.FC<{
  percent: number;
  chosenPrice?: string | number;
  currency: string;
  artistName?: string;
}> = ({ percent, chosenPrice, currency = "USD", artistName }) => {
  const [showTooltip, setShowTooltip] = useState(false);
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
        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer p-0 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: colors?.primary ?? "var(--mi-primary-color)",
          color: colors?.secondary ?? "var(--mi-secondary-color)",
        }}
        onClick={() => setShowTooltip(!showTooltip)}
        type="button"
      >
        ?
      </button>
      {showTooltip && (
        <div
          className="absolute z-10 rounded shadow p-3 text-sm whitespace-normal w-64 top-8 left-0 border"
          style={{
            backgroundColor:
              colors?.background ?? "var(--mi-normal-background-color)",
            borderColor: colors?.primary ?? "var(--mi-primary-color)",
            color: colors?.foreground ?? "var(--mi-foreground-color)",
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
