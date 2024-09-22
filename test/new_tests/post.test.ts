// tests/post.test.ts
import { processSinglePost, markdownAsHtml, doesPostBelongToUser } from '../post';
import prisma from '@mirlo/prisma';
import showdown from 'showdown';

jest.mock('@mirlo/prisma');
jest.mock('showdown');
const mockConverter = { makeHtml: jest.fn() };
showdown.Converter.mockImplementation(() => mockConverter);

describe('Post tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('processSinglePost should process post and add avatar', () => {
    const post = {
      artist: { avatar: { id: 1 } },
      isPublic: true,
    };
    const result = processSinglePost(post, true);

    expect(result.isContentHidden).toBe(false);
  });

  test('markdownAsHtml should convert markdown to HTML', () => {
    mockConverter.makeHtml.mockReturnValue('<h1>Test</h1>');

    const result = markdownAsHtml('# Test');

    expect(mockConverter.makeHtml).toHaveBeenCalledWith('# Test');
    expect(result).toBe('<h1>Test</h1>');
  });

  test('doesPostBelongToUser should verify post ownership', async () => {
    const mockReq = { params: { postId: 1 }, user: { id: 1, isAdmin: true } };
    const mockNext = jest.fn();

    prisma.post.findFirst.mockResolvedValue({ id: 1 });

    await doesPostBelongToUser(mockReq, {}, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
