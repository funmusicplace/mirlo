// tests/cors.test.ts
import { corsCheck } from '../cors';
import prisma from '@mirlo/prisma';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

jest.mock('@mirlo/prisma');
jest.mock('cors');

describe('CORS Tests', () => {
  const mockReq = {} as Request;
  const mockRes = {} as Response;
  const mockNext = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('corsCheck should call cors middleware with correct origins', async () => {
    prisma.client.findMany.mockResolvedValue([{ allowedCorsOrigins: ['http://test.com'] }]);
    cors.mockReturnValue(jest.fn());

    await corsCheck(mockReq, mockRes, mockNext);

    expect(cors).toHaveBeenCalledWith({
      origin: expect.arrayContaining(['http://test.com', 'http://localhost:3000']),
      credentials: true,
    });
  });
});
