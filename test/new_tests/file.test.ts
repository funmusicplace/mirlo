// tests/file.test.ts
import { checkFileType, checkFileTypeFromStream } from '../file';
import { fromFile, fromStream } from 'file-type';
import { Readable } from 'stream';

jest.mock('file-type');

describe('File Tests', () => {
  const mockCtx = { res: { status: jest.fn() } };
  const mockLogger = { error: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('checkFileType should throw error if file type is unsupported', async () => {
    fromFile.mockResolvedValue({ mime: 'image/png' });
    
    await expect(
      checkFileType(mockCtx, { path: 'file.png', mimetype: 'image/png' }, ['image/jpeg'], mockLogger)
    ).rejects.toEqual('File type not supported: image/png');
  });

  test('checkFileTypeFromStream should throw error if stream type is unsupported', async () => {
    fromStream.mockResolvedValue({ mime: 'application/pdf' });
    const mockStream = new Readable();

    await expect(
      checkFileTypeFromStream(mockCtx, mockStream, ['image/jpeg'], mockLogger)
    ).rejects.toEqual('File type not supported: application/pdf');
  });
});
