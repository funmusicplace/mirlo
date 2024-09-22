// tests/tracks.test.ts
import { deleteTrack, convertAudioToFormat, updateTrackArtists } from '../tracks';
import prisma from '@mirlo/prisma';
import { finalAudioBucket, removeObjectsFromBucket } from '../utils/minio';
import logger from '../logger';
import { Readable } from 'stream';

jest.mock('@mirlo/prisma');
jest.mock('../utils/minio');
jest.mock('../logger');

describe('Tracks tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('deleteTrack should delete the track and its associated audio', async () => {
    prisma.track.delete.mockResolvedValue(null);
    prisma.trackAudio.findFirst.mockResolvedValue({ id: 'audioId' });
    removeObjectsFromBucket.mockResolvedValue(null);

    await deleteTrack(1);

    expect(prisma.track.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(prisma.trackAudio.delete).toHaveBeenCalledWith({ where: { trackId: 1 } });
    expect(removeObjectsFromBucket).toHaveBeenCalledWith(finalAudioBucket, 'audioId');
  });

  test('convertAudioToFormat should convert audio stream to the specified format', async () => {
    const mockStream = new Readable();
    const onSuccessMock = jest.fn();
    const onErrorMock = jest.fn();

    await convertAudioToFormat('audioId', mockStream, { format: 'mp3' }, 'path', onErrorMock, onSuccessMock);

    expect(logger.info).toHaveBeenCalled();
    expect(onSuccessMock).toHaveBeenCalled();
  });
});
