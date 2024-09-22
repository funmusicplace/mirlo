// tests/index.test.ts
import router, { buildTokens, setTokens, clearJWT } from '../index';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '@mirlo/prisma';
import sendMail from '../../jobs/send-mail';

jest.mock('@mirlo/prisma');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('../../jobs/send-mail');

describe('Index Route Tests', () => {
  const mockReq = {} as Request;
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('buildTokens should generate access and refresh tokens', () => {
    jwt.sign.mockReturnValue('test-token');
    const result = buildTokens({ email: 'test@example.com', id: 1 });

    expect(result.accessToken).toBe('test-token');
    expect(result.refreshToken).toBe('test-token');
  });

  test('setTokens should set cookies with access and refresh tokens', () => {
    const user = { email: 'test@example.com', id: 1 };
    setTokens(mockRes, user);

    expect(mockRes.cookie).toHaveBeenCalledTimes(2);
  });

  test('clearJWT should clear JWT and refresh cookies', () => {
    clearJWT(mockRes);
    expect(mockRes.clearCookie).toHaveBeenCalledWith('jwt');
    expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh');
  });

  test('signup should respond with user and call next on success', async () => {
    prisma.user.create.mockResolvedValue({ id: 1, email: 'test@example.com' });
    const mockReq = { body: { email: 'test@example.com', password: 'password' } } as Request;

    await router(mockReq, mockRes, jest.fn());

    expect(prisma.user.create).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
  });
});
