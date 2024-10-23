import sinon from 'sinon';
import { expect } from 'chai';
import APIInstance from '../../APIInstance';
import fileSaver from 'file-saver';
import b64ToBlob from 'b64-to-blob';

describe('APIInstance Tests', () => {
  let fetchStub: sinon.SinonStub;
  let fileSaverStub: sinon.SinonStub;
  let b64ToBlobStub: sinon.SinonStub;

  before(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fileSaverStub = sinon.stub(fileSaver, 'saveAs');
    b64ToBlobStub = sinon.stub(b64ToBlob, 'default');
  });

  after(() => {
    fetchStub.restore();
    fileSaverStub.restore();
    b64ToBlobStub.restore();
  });

  it('should make a request and process response', async () => {
    fetchStub.resolves({
      json: sinon.stub().resolves({ success: true }),
      status: 200,
    } as Response);

    const api = APIInstance('http://api.test');
    const result = await api.request('test-endpoint');

    expect(result).to.deep.equal({ success: true });
  });

  // ... other tests converted similarly ...
});