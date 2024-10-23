import sinon from 'sinon';
import { expect } from 'chai';
import router, { buildTokens, setTokens, clearJWT } from '../../index';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '@mirlo/prisma';
import sendMail from '../../jobs/send-mail';

describe('Index Route Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  before(() => {
    sinon.stub(jwt, 'sign').returns('test-token');
    sinon.stub(prisma.user, 'create').resolves({ id: 1, email: 'test@example.com' });
    mockRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      cookie: sinon.stub(),
      clearCookie: sinon.stub(),
    };
  });

  after(() => {
    sinon.restore();
  });

  it('buildTokens should generate access and refresh tokens', () => {
    const result = buildTokens({ email: 'test@example.com', id: 1 });

    expect(result.accessToken).to.equal('test-token');
    expect(result.refreshToken).to.equal('test-token');
  });

  it('setTokens should set cookies with access and refresh tokens', () => {
    const user = { email: 'test@example.com', id: 1 };
    setTokens(mockRes as Response, user);

    sinon.assert.calledTwice(mockRes.cookie as sinon.SinonStub);
  });

  it('clearJWT should clear JWT and refresh cookies', () => {
    clearJWT(mockRes as Response);
    sinon.assert.calledWith(mockRes.clearCookie as sinon.SinonStub, 'jwt');
    sinon.assert.calledWith(mockRes.clearCookie as sinon.SinonStub, 'refresh');
  });

  it('signup should respond with user and call next on success', async () => {
    const mockReq = { body: { email: 'test@example.com', password: 'password' } } as Request;

    await router(mockReq, mockRes as Response, sinon.spy());

    sinon.assert.calledOnce(prisma.user.create as sinon.SinonStub);
    sinon.assert.calledWith(mockRes.json as sinon.SinonStub, sinon.match.object);
  });
});