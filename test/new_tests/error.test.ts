// tests/error.test.ts
import errorHandler, { AppError, HttpCode } from '../error';
import { Request, Response, NextFunction } from 'express';
import { PrismaClientValidationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('Error Tests', () => {
  test('AppError should set correct properties', () => {
    const error = new AppError({
      name: 'TestError',
      httpCode: HttpCode.BAD_REQUEST,
      description: 'Bad request error',
    });

    expect(error.name).toBe('TestError');
    expect(error.httpCode).toBe(HttpCode.BAD_REQUEST);
    expect(error.message).toBe('Bad request error');
  });

  test('errorHandler should handle AppError correctly', () => {
    const mockReq = {} as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn();

    const appError = new AppError({
      httpCode: HttpCode.NOT_FOUND,
      description: 'Resource not found',
    });

    errorHandler(appError, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HttpCode.NOT_FOUND);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Resource not found' });
  });

  test('errorHandler should handle Prisma validation error', () => {
    const mockReq = {} as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn();

    const prismaValidationError = new PrismaClientValidationError('Validation error occurred');

    errorHandler(prismaValidationError, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HttpCode.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error occurred' });
  });

  test('errorHandler should handle unknown error', () => {
    const mockReq = {} as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn();

    const unknownError = new Error('Unknown error');

    errorHandler(unknownError, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: undefined });
  });
});
