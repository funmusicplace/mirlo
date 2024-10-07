import { useState } from 'react';

function PurchaseForm({ onSubmit }) {
  const [amount, setAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (numAmount >= 100) { // Adjust this threshold as needed
      if (window.confirm(`You're about to pay ${numAmount}. This is a really large amount, while they will surely appreciate it, are super you sure?`)) {
        onSubmit(numAmount);
      }
    } else {
      onSubmit(numAmount);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        step="0.01"
      />
      <button type="submit">Purchase</button>
    </form>
  );
}