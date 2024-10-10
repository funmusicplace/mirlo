import sinon from 'sinon';
import { expect } from 'chai';
import { generateFullStaticImageUrl, convertURLArrayToSizes } from '../../images';

describe('Images Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let generateUrlStub: sinon.SinonStub;

  before(() => {
    originalEnv = { ...process.env };
    process.env.STATIC_MEDIA_HOST = 'http://localhost';
    generateUrlStub = sinon.stub();
  });

  after(() => {
    sinon.restore();
    process.env = originalEnv;
  });

  it('generateFullStaticImageUrl should return the correct image URL', () => {
    const url = generateFullStaticImageUrl('test', 'bucket');
    expect(url).to.equal('http://localhost/images/bucket/test.jpg');
  });

  it('convertURLArrayToSizes should map URLs to their sizes', () => {
    const urls = ['image-x100', 'image-x200'];
    const result = convertURLArrayToSizes(urls, 'bucket');

    expect(result).to.deep.equal({
      '100': 'http://localhost/images/bucket/image-x100.jpg',
      '200': 'http://localhost/images/bucket/image-x200.jpg',
    });
  });

  // ... other tests converted similarly ...
});