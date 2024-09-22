// tests/useErrorHandler.test.ts
import useErrorHandler, { isError } from '../useErrorHandler';
import { renderHook } from '@testing-library/react-hooks';
import { useSnackbar } from 'state/SnackbarContext';

jest.mock('state/SnackbarContext');

describe('useErrorHandler Tests', () => {
  const mockSnackbar = jest.fn();

  beforeEach(() => {
    useSnackbar.mockReturnValue(mockSnackbar);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('useErrorHandler should display API error message', () => {
    const { result } = renderHook(() => useErrorHandler());
    const apiError = { message: 'API error occurred', error: 'error' };

    result.current(apiError);

    expect(mockSnackbar).toHaveBeenCalledWith('API error occurred', { type: 'warning' });
  });

  test('useErrorHandler should display default message for unknown errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    result.current(new Error());

    expect(mockSnackbar).toHaveBeenCalledWith('There was a problem with the API', { type: 'warning' });
  });

  test('isError should return true for valid APIError object', () => {
    expect(isError({ message: 'Error' })).toBe(true);
    expect(isError(null)).toBe(false);
  });
});
