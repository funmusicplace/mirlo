import sinon from 'sinon';
import { expect } from 'chai';
import processTrackGroupCover from '../../processTrackGroupCover';
import prisma from '@mirlo/prisma';
import { sendToImageQueue } from '../../queues/processImages';

describe('processTrackGroupCover tests', () => {
  let sendToImageQueueStub: sinon.SinonStub;
  let upsertStub: sinon.SinonStub;

  before(() => {
    sendToImageQueueStub = sinon.stub(sendToImageQueue, 'default').callsFake((ctx, bucket1, bucket2, file, cb) => cb({ filename: 'cover.jpg' }));
    upsertStub = sinon.stub(prisma.trackGroupCover, 'upsert').resolves({});
  });

  after(() => {
    sinon.restore();
  });

  it('should upsert cover and send to image queue', async () => {
    const mockCtx = {};
    const result = await processTrackGroupCover(mockCtx as any)(1);

    sinon.assert.calledWith(sendToImageQueueStub);
    sinon.assert.calledWith(upsertStub, {
      create: { originalFilename: 'cover.jpg', trackGroupId: 1 },
      update: { originalFilename: 'cover.jpg', deletedAt: null },
      where: { trackGroupId: 1 },
    });
    expect(result).to.be.undefined;
  });
});