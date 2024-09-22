// tests/images.test.ts
import { generateFullStaticImageUrl, convertURLArrayToSizes } from '../images';

describe('Images Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, STATIC_MEDIA_HOST: 'http://localhost' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('generateFullStaticImageUrl should return the correct image URL', () => {
    const url = generateFullStaticImageUrl('test', 'bucket');
    expect(url).toBe('http://localhost/images/bucket/test.jpg');
  });

  test('convertURLArrayToSizes should map URLs to their sizes', () => {
    const urls = ['image-x100', 'image-x200'];
    const result = convertURLArrayToSizes(urls, 'bucket');

    expect(result).toEqual({
      '100': 'http://localhost/images/bucket/image-x100.jpg',
      '200': 'http://localhost/images/bucket/image-x200.jpg',
    });
  });
});
