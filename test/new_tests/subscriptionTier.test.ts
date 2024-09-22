// tests/subscriptionTier.test.ts
import { registerSubscription } from '../subscriptionTier';
import prisma from '@mirlo/prisma';
import logger from '../logger';

jest.mock('@mirlo/prisma');
jest.mock('../logger');

describe('Subscription Tier tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('registerSubscription should create or update subscription', async () => {
    prisma.artistUserSubscription.upsert.mockResolvedValue({
      id: 1,
      artistSubscriptionTier: { artistId: 1, artist: { userId: 2 } }
    });

    await registerSubscription({
      tierId: 1,
      userId: 2,
      amount: 1000,
      currency: 'USD',
      paymentProcessorKey: 'abc123'
    });

    expect(prisma.artistUserSubscription.upsert).toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        notificationType: 'USER_SUBSCRIBED_TO_YOU',
        artistId: 1,
        userId: 2,
        relatedUserId: 2,
      },
    });
  });
});
