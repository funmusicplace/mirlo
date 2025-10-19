import React from "react";
import { getCurrencySymbol } from "./Money";

interface CurrencyCoinIconProps {
  currency: string;
  size?: number | string;
}

const CurrencyCoinIcon: React.FC<CurrencyCoinIconProps> = ({
  currency,
  size = "1em"
}) => {
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <svg
      viewBox="0 0 100 100"
      height={size}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
      }}
    >
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />

      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="40"
        fontWeight="bold"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {currencySymbol}
      </text>
    </svg>
  );
};

export default CurrencyCoinIcon;
