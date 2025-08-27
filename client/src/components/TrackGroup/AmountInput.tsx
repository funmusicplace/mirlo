import React from "react";
const AmountInput: React.FC<{
  amount: number;
  setAmount: (amount: number) => void;
}> = ({ amount, setAmount }) => {
  return (
    <>
      <label
        htmlFor="price"
        className="block text-sm/6 font-medium text-gray-900"
      >
        Enter a custom amount
      </label>
      <div className="mt-2">
        <div className="flex items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-indigo-600">
          <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6 pr-3">
            $
          </div>
          <input
            type="text"
            name="price"
            value={amount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9.]/g, "");
              const numericValue = parseFloat(value);
              if (!isNaN(numericValue)) {
                setAmount(numericValue);
              } else {
                setAmount(0);
              }
            }}
            id="price"
            className="block min-w-0 grow py-1.5 px-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
            placeholder="0.00"
          />
          <div className="grid shrink-0 grid-cols-1 focus-within:relative">
            <div
              id="currency"
              aria-label="Currency"
              className="col-start-1 row-start-1 w-full appearance-none rounded-md py-1.5 pr-7 pl-3 text-base text-gray-500 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            >
              USD
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AmountInput;
