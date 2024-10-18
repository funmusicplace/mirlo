// tests/remarkEmbedder.test.js
import remarkEmbedder from '../remarkEmbedder';

describe('remarkEmbedder Tests', () => {
  test('remarkEmbedder should process markdown with embeds', async () => {
    const markdown = 'Some text with ![embed](http://example.com)';
    const result = await remarkEmbedder.process(markdown);

    expect(result).toContain('<img src="http://example.com"');
  });

  test('remarkEmbedder should not change markdown without embeds', async () => {
    const markdown = 'Just regular markdown text.';
    const result = await remarkEmbedder.process(markdown);

    expect(result).toBe('Just regular markdown text.');
  });
});
