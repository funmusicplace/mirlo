// tests/ownership.test.ts
import { doesSubscriptionTierBelongToUser, doesTrackGroupBelongToUser, canUserListenToTrack } from '../ownership';
import prisma from '@mirlo/prisma';

jest.mock('@mirlo/prisma');

describe('Ownership Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('doesSubscriptionTierBelongToUser should return subscription tier if belongs to user', async () => {
    prisma.artist.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.artistSubscriptionTier.findFirst.mockResolvedValue({ id: 1 });

    const result = await doesSubscriptionTierBelongToUser(1, 1);

    expect(prisma.artist.findMany).toHaveBeenCalledWith({ where: { userId: 1 } });
    expect(result).toEqual({ id: 1 });
  });

  test('doesTrackGroupBelongToUser should throw error if track group does not belong to user', async () => {
    prisma.trackGroup.findFirst.mockResolvedValue(null);

    await expect(doesTrackGroupBelongToUser(1, { id: 1, isAdmin: false })).rejects.toThrow('TrackGroup does not exist or does not belong to user');
  });

  test('canUserListenToTrack should return true if user can listen to track', async () => {
    prisma.track.findUnique.mockResolvedValue({ id: 1, isPreview: true });
    const result = await canUserListenToTrack(1, { id: 1 });

    expect(result).toBe(true);
  });
});
