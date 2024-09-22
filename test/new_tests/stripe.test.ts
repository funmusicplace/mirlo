// tests/stripe.test.ts
import {
  createTrackGroupStripeProduct,
  createStripeCheckoutSessionForPurchase,
  verifyStripeSignature,
} from '../stripe';
import prisma from '@mirlo/prisma';
import Stripe from 'stripe';

jest.mock('@mirlo/prisma');
jest.mock('stripe');
jest.mock('../logger');

const mockStripe = new Stripe('', { apiVersion: '2022-11-15' });

describe('Stripe tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createTrackGroupStripeProduct should create a Stripe product if one does not exist', async () => {
    prisma.trackGroup.update.mockResolvedValue({});
    mockStripe.products.create.mockResolvedValue({ id: 'product_123' });

    const trackGroup = {
      id: 1,
      title: 'Test Album',
      artist: { name: 'Artist' },
      stripeProductKey: null,
    };

    const result = await createTrackGroupStripeProduct(trackGroup, 'acct_123');

    expect(mockStripe.products.create).toHaveBeenCalled();
    expect(prisma.trackGroup.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { stripeProductKey: 'product_123' },
    });
    expect(result).toBe('product_123');
  });

  test('createStripeCheckoutSessionForPurchase should create a checkout session', async () => {
    prisma.client.findFirst.mockResolvedValue({});
    mockStripe.checkout.sessions.create.mockResolvedValue({ id: 'session_123' });

    const result = await createStripeCheckoutSessionForPurchase({
      email: 'test@example.com',
      priceNumber: 1000,
      trackGroup: { id: 1, platformPercent: 5, currency: 'USD' },
      productKey: 'prod_123',
      stripeAccountId: 'acct_123',
    });

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    expect(result.id).toBe('session_123');
  });

  test('verifyStripeSignature should verify event using Stripe signature', async () => {
    const mockReq = { headers: { 'stripe-signature': 'sig_123' }, rawBody: 'raw-body' };
    mockStripe.webhooks.constructEvent.mockReturnValue({ id: 'evt_123' });

    const result = await verifyStripeSignature(mockReq, {}, 'secret');
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith('raw-body', 'sig_123', 'secret');
    expect(result.id).toBe('evt_123');
  });
});
