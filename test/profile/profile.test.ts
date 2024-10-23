import sinon from 'sinon';
import { expect } from 'chai';
import profile from '../../profile';
import prisma from '@mirlo/prisma';
import { Request, Response, NextFunction } from 'express';

describe('Profile Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: sinon.SinonSpy;

  before(() => {
    sinon.stub(prisma.user, 'findFirst').resolves({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    });
    mockReq = { user: { email: 'test@example.com' } };
    mockRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    mockNext = sinon.spy();
  });

  after(() => {
    sinon.restore();
  });

  it('profile should return user profile data', async () => {
    await profile(mockReq as Request, mockRes as Response, mockNext);

    sinon.assert.calledWith(prisma.user.findFirst as sinon.SinonStub, sinon.match.object);
    sinon.assert.calledWith(mockRes.status as sinon.SinonStub, 200);
    sinon.assert.calledWith(mockRes.json as sinon.SinonStub, sinon.match.object);
  });

  it('profile should call next with error on failure', async () => {
    const mockError = new Error('Profile error');
    (prisma.user.findFirst as sinon.SinonStub).rejects(mockError);

    await profile(mockReq as Request, mockRes as Response, mockNext);

    sinon.assert.calledWith(mockNext, mockError);
  });
});