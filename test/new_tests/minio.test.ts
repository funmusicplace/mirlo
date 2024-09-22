// tests/minio.test.ts
import { createBucketIfNotExists, getBufferFromMinio, getFileFromMinio } from '../minio';
import { minioClient } from '../minio';
import fs from 'fs';
import { Logger } from 'winston';

jest.mock('fs');
jest.mock('minio');

describe('MinIO Tests', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  test('createBucketIfNotExists should create a bucket if it does not exist', async () => {
    minioClient.bucketExists.mockResolvedValue(false);
    minioClient.makeBucket.mockResolvedValue(null);

    await createBucketIfNotExists(minioClient, 'test-bucket', mockLogger);

    expect(minioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
    expect(minioClient.makeBucket).toHaveBeenCalledWith('test-bucket');
  });

  test('getBufferFromMinio should retrieve buffer from MinIO', async () => {
    const mockStream = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('test-data'));
        }
        if (event === 'end') {
          callback();
        }
        return mockStream;
      }),
    };
    minioClient.getObject.mockResolvedValue(mockStream);

    const result = await getBufferFromMinio(minioClient, 'bucket', 'filename', mockLogger);

    expect(minioClient.getObject).toHaveBeenCalledWith('bucket', 'filename');
    expect(result).toEqual({ buffer: Buffer.from('test-data'), size: 9 });
  });

  test('getFileFromMinio should download file from MinIO', async () => {
    fs.createWriteStream.mockReturnValue({
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          callback();
        }
      }),
    });
    minioClient.getObject.mockResolvedValue({
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('file-data'));
        }
        if (event === 'end') {
          callback();
        }
      }),
    });
    
    const result = await getFileFromMinio(minioClient, 'bucket', 'filename', 'folder', 'filepath', mockLogger);
    
    expect(fs.mkdirSync).toHaveBeenCalledWith('folder', { recursive: true });
    expect(result.filePath).toBe('folder/filepath');
  });
});
