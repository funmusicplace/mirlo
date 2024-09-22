// tests/profile.test.ts
import profile from '../profile';
import prisma from '@mirlo/prisma';
import { Request, Response, NextFunction } from 'express';

jest.mock('@mirlo/prisma');

describe('Profile Tests', () => {
  const mockReq = {
    user: { email: 'test@example.com' },
  } as unknown as Request;
  const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  const mockNext = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('profile should return user profile data', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    });

    await profile(mockReq, mockRes, mockNext);

    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ result: expect.objectContaining({ email: 'test@example.com' }) });
  });

  test('profile should call next with error on failure', async () => {
    const mockError = new Error('Profile error');
    prisma.user.findFirst.mockRejectedValue(mockError);

    await profile(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
