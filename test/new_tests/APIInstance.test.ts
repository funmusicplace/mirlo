// tests/APIInstance.test.ts
import APIInstance from '../APIInstance';
import fileSaver from 'file-saver';
import b64ToBlob from 'b64-to-blob';

jest.mock('file-saver');
jest.mock('b64-to-blob');

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('APIInstance Tests', () => {
  const api = APIInstance('http://api.test');

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('apiRequest should make a request and process response', async () => {
    mockFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true }),
      status: 200,
    });

    const result = await api.request('test-endpoint');
    expect(result).toEqual({ success: true });
  });

  test('uploadFile should send a file via PUT request', async () => {
    mockFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ jobId: '123' }),
    });

    const file = new File(['test-content'], 'test.txt');
    const result = await api.uploadFile('upload-endpoint', [file]);

    expect(result).toEqual({ result: { jobId: '123' } });
  });

  test('getFile should download and save file', async () => {
    const mockText = 'base64encodedtext';
    mockFetch.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockText),
    });
    b64ToBlob.mockReturnValue(new Blob());

    await api.getFile('filename', 'endpoint', 'application/pdf');

    expect(fileSaver.saveAs).toHaveBeenCalled();
  });
});
