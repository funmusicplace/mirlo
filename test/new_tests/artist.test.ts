// tests/artist.test.ts
import {
  confirmArtistIdExists,
  subscribeUserToArtist,
  deleteArtist,
} from '../artist';
import prisma from '@mirlo/prisma';
import { Request, Response, NextFunction } from 'express';

jest.mock('@mirlo/prisma');
jest.mock('../minio');
jest.mock('../stripe');

describe('Artist Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('confirmArtistIdExists should throw error if artist is not found', async () => {
    const mockReq = { params: { id: 1 } } as unknown as Request;
    const mockNext = jest.fn();
    prisma.artist.findFirst.mockResolvedValue(null);

    await confirmArtistIdExists(mockReq, {} as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  test('subscribeUserToArtist should create default subscription if not exists', async () => {
    prisma.artistUserSubscription.findFirst.mockResolvedValue(null);
    prisma.artistSubscriptionTier.create.mockResolvedValue({
      id: 1,
      isDefaultTier: true,
    });
    prisma.notification.create.mockResolvedValue({});
    
    const mockArtist = {
      id: 1,
      user: { currency: 'USD' },
      subscriptionTiers: [],
      userId: 1,
    };

    const subscriptions = await subscribeUserToArtist(mockArtist, { id: 1 });

    expect(prisma.artistSubscriptionTier.create).toHaveBeenCalled();
    expect(prisma.artistUserSubscription.upsert).toHaveBeenCalled();
    expect(subscriptions).toBeDefined();
  });

  test('deleteArtist should remove artist and related entities', async () => {
    prisma.artist.update.mockResolvedValue({});
    prisma.artist.deleteMany.mockResolvedValue({});
    prisma.post.deleteMany.mockResolvedValue({});
    prisma.trackGroup.findMany.mockResolvedValue([{ id: 1 }]);
    
    await deleteArtist(1, 1);

    expect(prisma.artist.update).toHaveBeenCalledWith({ where: { id: 1, userId: 1 }, data: { urlSlug: 'deleted-1' } });
    expect(prisma.artist.deleteMany).toHaveBeenCalled();
    expect(prisma.post.deleteMany).toHaveBeenCalled();
  });
});
