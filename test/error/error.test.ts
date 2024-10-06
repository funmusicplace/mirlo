import sinon from 'sinon';
import { expect } from 'chai';
import errorHandler, { AppError, HttpCode } from '../../error';
import { Request, Response, NextFunction } from 'express';
import { PrismaClientValidationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('Error Tests', () => {
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

  it('AppError should set correct properties', () => {
    const error = new AppError({
      name: 'TestError',
      httpCode: HttpCode.BAD_REQUEST,
      description: 'Bad request error',
    });

    expect(error.name).to.equal('TestError');
    expect(error.httpCode).to.equal(HttpCode.BAD_REQUEST);
    expect(error.message).to.equal('Bad request error');
  });

  it('errorHandler should handle AppError correctly', () => {
    const appError = new AppError({
      httpCode: HttpCode.NOT_FOUND,
      description: 'Resource not found',
    });

    errorHandler(appError, mockReq as Request, mockRes as Response, mockNext as NextFunction);

    sinon.assert.calledWith(mockRes.status as sinon.SinonStub, HttpCode.NOT_FOUND);
    sinon.assert.calledWith(mockRes.json as sinon.SinonStub, { error: 'Resource not found' });
  });

  it('errorHandler should handle Prisma validation error', () => {
    const prismaValidationError = new PrismaClientValidationError('Validation error occurred');

    errorHandler(prismaValidationError, mockReq as Request, mockRes as Response, mockNext as NextFunction);

    sinon.assert.calledWith(mockRes.status as sinon.SinonStub, HttpCode.BAD_REQUEST);
    sinon.assert.calledWith(mockRes.json as sinon.SinonStub, { error: 'Validation error occurred' });
  });

  it('errorHandler should handle unknown error', () => {
    const unknownError = new Error('Unknown error');

    errorHandler(unknownError, mockReq as Request, mockRes as Response, mockNext as NextFunction);

    sinon.assert.calledWith(mockRes.status as sinon.SinonStub, 500);
    sinon.assert.calledWith(mockRes.json as sinon.SinonStub, { error: undefined });
  });

  // ... other tests converted similarly ...
});