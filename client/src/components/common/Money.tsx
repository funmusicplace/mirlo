export const moneyDisplay = ({
  amount,
  currency,
}: {
  amount?: number | string;
  currency: string;
}) => {
  if (!amount) {
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
