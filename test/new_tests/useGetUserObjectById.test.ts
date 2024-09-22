// tests/useGetUserObjectById.test.ts
import { renderHook } from '@testing-library/react-hooks';
import useGetUserObjectById from '../useGetUserObjectById';
import api from 'services/api';

jest.mock('services/api');

describe('useGetUserObjectById Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('useGetUserObjectById should fetch user object by ID', async () => {
    api.get.mockResolvedValue({ result: { id: 1, name: 'John Doe' } });

    const { result, waitForNextUpdate } = renderHook(() => useGetUserObjectById('endpoint', 1, '123'));

    await waitForNextUpdate();

    expect(api.get).toHaveBeenCalledWith('users/1/endpoint/123');
    expect(result.current.object).toEqual({ id: 1, name: 'John Doe' });
    expect(result.current.isLoadingObject).toBe(false);
  });

  test('useGetUserObjectById should set objects when multiple is true', async () => {
    api.getMany.mockResolvedValue({ results: [{ id: 1 }, { id: 2 }] });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetUserObjectById('endpoint', 1, '123', '', { multiple: true })
    );

    await waitForNextUpdate();

    expect(api.getMany).toHaveBeenCalledWith('users/1/endpoint/123');
    expect(result.current.objects).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
