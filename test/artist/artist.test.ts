import sinon from 'sinon';
import { expect } from 'chai';
import {
  confirmArtistIdExists,
  subscribeUserToArtist,
  deleteArtist,
} from '../../artist';
import prisma from '@mirlo/prisma';

describe('Artist Tests', () => {
  let prismaStub: sinon.SinonStub;

  before(() => {
    sinon.stub(prisma.artist, 'findFirst');
    sinon.stub(prisma.artistUserSubscription, 'findFirst');
    sinon.stub(prisma.artistSubscriptionTier, 'create');
    sinon.stub(prisma.notification, 'create');
    // ... other stubs ...
  });

  after(() => {
    sinon.restore();
  });

  it('should throw error if artist is not found', async () => {
    (prisma.artist.findFirst as sinon.SinonStub).resolves(null);
    const mockReq = { params: { id: 1 } };
    const mockNext = sinon.spy();

    await confirmArtistIdExists(mockReq as any, {} as any, mockNext as any);

    sinon.assert.calledWith(mockNext, sinon.match.instanceOf(Error));
  });

  // ... other tests converted similarly ...
});