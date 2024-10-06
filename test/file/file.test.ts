import sinon from 'sinon';
import { expect } from 'chai';
import { checkFileType, checkFileTypeFromStream } from '../../file';
import { fromFile, fromStream } from 'file-type';
import { Readable } from 'stream';
import { Logger } from 'winston';

describe('File Tests', () => {
  let fromFileStub: sinon.SinonStub;
  let fromStreamStub: sinon.SinonStub;
  let loggerStub: sinon.SinonStubbedInstance<Logger>;

  before(() => {
    fromFileStub = sinon.stub(fromFile, 'default');
    fromStreamStub = sinon.stub(fromStream, 'default');
    loggerStub = sinon.createStubInstance(Logger);
  });

  after(() => {
    sinon.restore();
  });

  it('checkFileType should throw error if file type is unsupported', async () => {
    fromFileStub.resolves({ mime: 'image/png' });
    
    try {
      await checkFileType({}, { path: 'file.png', mimetype: 'image/png' }, ['image/jpeg'], loggerStub);
      expect.fail('Expected error was not thrown');
    } catch (error) {
      expect(error).to.equal('File type not supported: image/png');
    }
  });

  it('checkFileTypeFromStream should throw error if stream type is unsupported', async () => {
    fromStreamStub.resolves({ mime: 'application/pdf' });
    const mockStream = new Readable();
    
    try {
      await checkFileTypeFromStream({}, mockStream, ['image/jpeg'], loggerStub);
      expect.fail('Expected error was not thrown');
    } catch (error) {
      expect(error).to.equal('File type not supported: application/pdf');
    }
  });

  // ... other tests converted similarly ...
});