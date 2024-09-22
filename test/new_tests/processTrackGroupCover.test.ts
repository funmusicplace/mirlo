// tests/processTrackGroupCover.test.ts
import processTrackGroupCover from '../processTrackGroupCover';
import prisma from '@mirlo/prisma';
import { sendToImageQueue } from '../queues/processImages';

jest.mock('@mirlo/prisma');
jest.mock('../queues/processImages');

describe('processTrackGroupCover tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('processTrackGroupCover should upsert cover and send to image queue', async () => {
    const mockCtx = {};
    const mockFileInfo = { filename: 'cover.jpg' };

    sendToImageQueue.mockImplementation(async (ctx, bucket1, bucket2, file, cb) => cb(mockFileInfo));

    prisma.trackGroupCover.upsert.mockResolvedValue({});

    const result = await processTrackGroupCover(mockCtx)(1);

    expect(sendToImageQueue).toHaveBeenCalled();
    expect(prisma.trackGroupCover.upsert).toHaveBeenCalledWith({
      create: { originalFilename: 'cover.jpg', trackGroupId: 1 },
      update: { originalFilename: 'cover.jpg', deletedAt: null },
      where: { trackGroupId: 1 },
    });
  });
});
