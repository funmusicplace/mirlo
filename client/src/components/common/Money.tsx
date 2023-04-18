export const Money: React.FC<{
  amount?: number | string;
  currency?: string;
}> = ({ amount, currency = "USD" }) => {
  if (!amount) {
    return <>-</>;
  }
  return (
    <>
      {new Intl.NumberFormat("us", {
        style: "currency",
        currency,
      }).format(+amount)}
    </>
  );
};

export default Money;
