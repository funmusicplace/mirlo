// tests/getHtmlExcerpt.test.ts
import { getHtmlExcerpt } from '../getHtmlExcerpt';

describe('getHtmlExcerpt Tests', () => {
  test('getHtmlExcerpt should extract text from HTML string', () => {
    const htmlString = '<h1>Title</h1><p>Paragraph</p>';
    const result = getHtmlExcerpt(htmlString);

    expect(result).toEqual(['Title', 'Paragraph']);
  });

  test('getHtmlExcerpt should ignore non-matching tags', () => {
    const htmlString = '<div>Not included</div><h2>Header</h2>';
    const result = getHtmlExcerpt(htmlString);

    expect(result).toEqual(['Header']);
  });
});
