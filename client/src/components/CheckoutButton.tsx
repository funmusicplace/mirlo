import React from 'react';
import { useHistory } from 'react-router-dom';
import api from '../utils/api';

interface CheckoutButtonProps {
  itemId: string;
  itemType: 'album' | 'subscription';
}

const CheckoutButton: React.FC<CheckoutButtonProps> = ({ itemId, itemType }) => {
  const history = useHistory();

  const handleCheckout = async () => {
    try {
      const response = await api.post('/v1/checkout', { itemId, itemType });
      if (response.data.success) {
        history.push(response.data.redirectUrl, response.data.state);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      // Handle error (show error message to user)
    }
  };

  return <button onClick={handleCheckout}>Checkout</button>;
};

export default CheckoutButton;