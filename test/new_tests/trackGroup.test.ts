// tests/trackGroup.test.ts
import { deleteTrackGroup, buildZipFileForPath } from '../trackGroup';
import prisma from '@mirlo/prisma';
import { removeObjectsFromBucket } from '../minio';
import logger from '../logger';
import archiver from 'archiver';

jest.mock('@mirlo/prisma');
jest.mock('../minio');
jest.mock('../logger');
jest.mock('archiver');

describe('TrackGroup tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('deleteTrackGroup should delete the track group and its tracks if deleteAll is true', async () => {
    prisma.trackGroup.delete.mockResolvedValue(null);
    prisma.track.findMany.mockResolvedValue([{ id: 1 }]);
    const deleteTrackMock = jest.fn();

    await deleteTrackGroup(1, true);

    expect(prisma.trackGroup.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(deleteTrackMock).toHaveBeenCalledWith(1);
  });

  test('buildZipFileForPath should zip tracks and append them to response', async () => {
    const mockRes = { pipe: jest.fn() };
    const mockArchive = {
      append: jest.fn(),
      finalize: jest.fn(),
      pipe: jest.fn(),
    };
    archiver.mockReturnValue(mockArchive);

    const tracks = [{ title: 'Track 1', audio: { id: 'audio1' } }];
    await buildZipFileForPath(tracks, 'mp3', mockRes);

    expect(mockArchive.append).toHaveBeenCalled();
    expect(mockArchive.finalize).toHaveBeenCalled();
  });
});
