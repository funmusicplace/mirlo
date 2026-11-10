// Stripe's standard processing fee (2.9% + $0.30 per charge), in major units.
export const estimateStripeFee = (amount: number) => amount * 0.029 + 0.3;
