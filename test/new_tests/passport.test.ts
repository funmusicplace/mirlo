// tests/passport.test.ts
import { userLoggedInWithoutRedirect, userAuthenticated, userHasPermission } from '../passport';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';

jest.mock('passport');

describe('Passport Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('userLoggedInWithoutRedirect should call next when authenticated', () => {
    const mockReq = { cookies: { jwt: 'token' } } as Request;
    const mockRes = {} as Response;
    const mockNext = jest.fn();

    passport.authenticate = jest.fn((strategy, options, callback) => {
      return (req: Request, res: Response, next: NextFunction) => {
        callback(null, { id: 1 }, null);
      };
    });

    userLoggedInWithoutRedirect(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('userAuthenticated should return 401 if not authenticated', () => {
    const mockReq = {} as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn();

    passport.authenticate = jest.fn(() => () => {
      mockNext();
    });

    userAuthenticated(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  test('userHasPermission should allow access if user is admin', () => {
    const mockReq = { user: { isAdmin: true }, params: { userId: '1' } } as unknown as Request;
    const mockRes = { status: jest.fn(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn();

    userHasPermission('admin')(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('userHasPermission should return 401 if user is not admin', () => {
    const mockReq = { user: { isAdmin: false }, params: { userId: '1' } } as unknown as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn();

    userHasPermission('admin')(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});
