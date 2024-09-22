// tests/subscribe.test.ts
import { POST, DELETE } from '../subscribe';
import prisma from '@mirlo/prisma';
import stripe from '../../../../utils/stripe';
import { Request, Response, NextFunction } from 'express';

jest.mock('@mirlo/prisma');
jest.mock('../../../../utils/stripe');
jest.mock('../../../../utils/artist');
jest.mock('../../../../logger');
jest.mock('../../../../utils/settings');

describe('Subscribe Tests', () => {
  const mockReq = {
    body: { tierId: 1, email: 'test@example.com', amount: 500 },
    params: { id: '1' },
    user: { id: 1 },
  } as unknown as Request;
  const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  const mockNext = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST should create a subscription', async () => {
    prisma.artistSubscriptionTier.findFirst.mockResolvedValue({
      artist: { user: { stripeAccountId: 'acct_123' } },
    });
    stripe.checkout.sessions.create.mockResolvedValue({ id: 'session_123', url: 'http://checkout.url' });

    await POST(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ sessionUrl: 'http://checkout.url' });
  });

  test('DELETE should remove user subscription', async () => {
    prisma.artistUserSubscription.deleteMany.mockResolvedValue({ count: 1 });

    await DELETE(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'success' });
  });
});
