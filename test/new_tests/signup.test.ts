// tests/signup.test.ts
import signup from '../signup';
import prisma from '@mirlo/prisma';
import { Request, Response, NextFunction } from 'express';
import { hashPassword } from '../index';
import sendMail from '../../jobs/send-mail';

jest.mock('@mirlo/prisma');
jest.mock('../index');
jest.mock('../../jobs/send-mail');

describe('Signup Tests', () => {
  const mockReq = {
    body: {
      email: 'test@example.com',
      password: 'password',
      name: 'Test User',
    },
  } as unknown as Request;
  const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  const mockNext = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('signup should create new user and send confirmation email', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1, email: 'test@example.com' });
    hashPassword.mockResolvedValue('hashed-password');

    await signup(mockReq, mockRes, mockNext);

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
    expect(sendMail).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1, email: 'test@example.com' }));
  });

  test('signup should return error if user already exists', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1 });

    await signup(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'A user with this email already exists' });
  });
});
