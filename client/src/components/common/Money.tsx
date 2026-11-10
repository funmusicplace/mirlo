export const getCurrencySymbol = (currency?: string, locale?: string) => {
  if (!currency) {
    return null;
  }
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
  options,
}: {
  amount?: number | string;
  currency?: string;
  options?: Intl.NumberFormatOptions;
}) => {
  if (amount === undefined || amount === null) {
    return "-";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "usd",
    ...options,
  }).format(+amount);
};

export const Money: React.FC<{
  amount?: number | string;
  currency?: string;
}> = ({ amount, currency }) => {
  return <>{moneyDisplay({ amount, currency })}</>;
};

export default Money;

export const centsDisplay = (cents: number, currency?: string) =>
  moneyDisplay({
    amount: cents / 100,
    currency,
    options: { trailingZeroDisplay: "stripIfInteger" },
  });
