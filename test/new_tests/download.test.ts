// tests/download.test.ts
import { downloadCSVFile } from '../download';
import { Response } from 'express';
import { Parser } from 'json2csv';

jest.mock('json2csv');

describe('Download Tests', () => {
  const mockRes = {
    header: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;

  test('downloadCSVFile should convert JSON to CSV and send the file', () => {
    const mockData = [{ name: 'John Doe' }];
    const mockFields = [{ label: 'Name', value: 'name' }];
    const mockCsvParser = {
      parse: jest.fn().mockReturnValue('name\nJohn Doe'),
    };
    Parser.mockImplementation(() => mockCsvParser);

    downloadCSVFile(mockRes, 'test.csv', mockFields, mockData);

    expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.send).toHaveBeenCalledWith('name\nJohn Doe');
  });
});
