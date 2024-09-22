// tests/refresh.test.ts
import refresh from '../refresh';
import { Request, Response, NextFunction } from 'express';
import prisma from '@mirlo/prisma';
import jwt from 'jsonwebtoken';

jest.mock('@mirlo/prisma');
jest.mock('jsonwebtoken');

describe('Refresh Token Tests', () => {
  const mockReq = {
    cookies: { refresh: 'mock-refresh-token' },
  } as Request;
  const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
  const mockNext = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('refresh should return new tokens when valid refresh token is provided', async () => {
    jwt.verify.mockImplementation((token, secret, options, callback) => callback(null, { email: 'test@example.com' }));
    prisma.user.findFirst.mockResolvedValue({ id: 1, email: 'test@example.com' });

    await refresh(mockReq, mockRes, mockNext);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Success' });
  });

  test('refresh should return 406 for invalid token', async () => {
    jwt.verify.mockImplementation((token, secret, options, callback) => callback(new Error('Token error'), null));

    await refresh(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(406);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});
