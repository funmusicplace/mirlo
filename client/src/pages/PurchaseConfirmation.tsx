import React from 'react';
import { useLocation } from 'react-router-dom';

interface ConfirmationState {
  type: 'purchase' | 'subscription';
  itemName: string;
  amount: number;
}

const PurchaseConfirmation: React.FC = () => {
  const location = useLocation();
  const state = location.state as ConfirmationState;

  if (!state) {
    return <div>Invalid confirmation page access</div>;
  }

  return (
    <div>
      <h1>Thank you for your {state.type}!</h1>
      <p>You have successfully {state.type === 'purchase' ? 'purchased' : 'subscribed to'} {state.itemName}.</p>
      {state.amount && <p>Amount: ${state.amount.toFixed(2)}</p>}
      <p>You will receive a confirmation email shortly.</p>
    </div>
  );
};

export default PurchaseConfirmation;