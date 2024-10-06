import sinon from 'sinon';
import { expect } from 'chai';
import { corsCheck } from '../../cors';
import prisma from '@mirlo/prisma';
import cors from 'cors';

describe('CORS Tests', () => {
  let corsStub: sinon.SinonStub;

  before(() => {
    sinon.stub(prisma.client, 'findMany').resolves([{ allowedCorsOrigins: ['http://test.com'] }]);
    corsStub = sinon.stub(cors, 'default').returns((req: any, res: any, next: any) => next());
  });

  after(() => {
    sinon.restore();
  });

  it('should call cors middleware with correct origins', async () => {
    const mockReq = {} as any;
    const mockRes = {} as any;
    const mockNext = sinon.spy();

    await corsCheck(mockReq, mockRes, mockNext);

    sinon.assert.calledWith(corsStub, {
      origin: sinon.match.array.contains(['http://test.com', 'http://localhost:3000']),
      credentials: true,
    });
    sinon.assert.calledOnce(mockNext);
  });
});