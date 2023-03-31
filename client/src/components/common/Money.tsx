export const Money: React.FC<{ amount?: number | string }> = ({ amount }) => {
  if (!amount) {
    return <>-</>;
  }
  return (
    <>
      {new Intl.NumberFormat("us", {
        style: "currency",
        currency: "USD",
      }).format(+amount)}
    </>
  );
};

export default Money;
