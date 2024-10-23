import sinon from 'sinon';
import { expect } from 'chai';
import remarkEmbedder from '../../remarkEmbedder';

describe('remarkEmbedder Tests', () => {
  it('should process markdown with embeds', async () => {
    const markdown = 'Some text with ![embed](http://example.com)';
    const result = await remarkEmbedder.process(markdown);

    expect(result).to.contain('<img src="http://example.com"');
  });

  it('should not change markdown without embeds', async () => {
    const markdown = 'Just regular markdown text.';
    const result = await remarkEmbedder.process(markdown);

    expect(result).to.equal('Just regular markdown text.');
  });
});