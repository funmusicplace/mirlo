// tests/useLinkContainer.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { useLinkContainer } from '../useLinkContainer';
import { useHref, useLinkClickHandler } from 'react-router-dom';

jest.mock('react-router-dom');

describe('useLinkContainer Tests', () => {
  const mockHref = '/test';
  const mockNavigate = jest.fn();

  beforeEach(() => {
    useHref.mockReturnValue(mockHref);
    useLinkClickHandler.mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('useLinkContainer should handle click and navigate', () => {
    const { result } = renderHook(() => useLinkContainer({ to: '/test' }));

    result.current.onClick({ button: 0, preventDefault: jest.fn(), target: {} });
    expect(mockNavigate).toHaveBeenCalled();
  });
});
