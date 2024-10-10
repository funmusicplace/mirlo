import sinon from 'sinon';
import { expect } from 'chai';
import { userLoggedInWithoutRedirect, userAuthenticated, userHasPermission } from '../../passport';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';

describe('Passport Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: sinon.SinonSpy;

  before(() => {
    mockReq = {};
    mockRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    mockNext = sinon.spy();
  });

  after(() => {
    sinon.restore();
  });

  it('userLoggedInWithoutRedirect should call next when authenticated', () => {
    mockReq.cookies = { jwt: 'token' };
    passport.authenticate = sinon.stub().callsFake((strategy, options, callback) => {
      return (req: Request, res: Response, next: NextFunction) => {
        callback(null, { id: 1 }, null);
      };
    });

    userLoggedInWithoutRedirect(mockReq as Request, mockRes as Response, mockNext);
    sinon.assert.calledOnce(mockNext);
  });

  it('userAuthenticated should return 401 if not authenticated', () => {
    passport.authenticate = sinon.stub().returns(() => {
      mockNext();
    });

    userAuthenticated(mockReq as Request, mockRes as Response, mockNext);
    sinon.assert.calledWith(mockRes.status as sinon.SinonStub, 401);
    sinon.assert.calledWith(mockRes.json as sinon.SinonStub, { error: 'Unauthorized' });
  });

  it('userHasPermission should allow access if user is admin', () => {
    mockReq.user = { isAdmin: true };
    userHasPermission('admin')(mockReq as Request, mockRes as Response, mockNext);
    sinon.assert.calledOnce(mockNext);
  });

  it('userHasPermission should return 401 if user is not admin', () => {
    mockReq.user = { isAdmin: false };
    userHasPermission('admin')(mockReq as Request, mockRes as Response, mockNext);
    sinon.assert.calledWith(mockRes.status as sinon.SinonStub, 401);
    sinon.assert.calledWith(mockRes.json as sinon.SinonStub, { error: 'Unauthorized' });
  });
});