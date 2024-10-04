export const getCurrencySymbol = (currency: string, locale?: string) => {
  return (0)
    .toLocaleString(locale, {
      style: "currency",
      currency: currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    .replace(/\d/g, "")
    .trim();
};

export const moneyDisplay = ({
  amount,
  currency,
}: {
  amount?: number | string;
  currency: string;
}) => {
  if (amount === undefined || amount === null) {
    return "-";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(+amount);
};

export const Money: React.FC<{
  amount?: number | string;
  currency: string;
}> = ({ amount, currency }) => {
  return <>{moneyDisplay({ amount, currency })}</>;
};

export default Money;
