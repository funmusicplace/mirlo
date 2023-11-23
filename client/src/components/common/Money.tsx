export const moneyDisplay = ({
  amount,
  currency = "USD",
}: {
  amount?: number | string;
  currency?: string;
}) => {
  if (!amount) {
    return "-";
  }
  return new Intl.NumberFormat("us", {
    style: "currency",
    currency,
  }).format(+amount);
};

export const Money: React.FC<{
  amount?: number | string;
  currency?: string;
}> = ({ amount, currency = "USD" }) => {
  return <>{moneyDisplay({ amount, currency })}</>;
};

export default Money;
