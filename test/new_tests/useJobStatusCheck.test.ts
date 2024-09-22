// tests/useJobStatusCheck.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import useJobStatusCheck from '../useJobStatusCheck';
import api from 'services/api';

jest.mock('services/api');

describe('useJobStatusCheck Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('useJobStatusCheck should reload when jobs are completed', async () => {
    const mockReload = jest.fn();
    const mockReset = jest.fn();
    api.getMany.mockResolvedValue({ results: [{ jobId: '1', jobStatus: 'completed' }] });

    const { result } = renderHook(() => useJobStatusCheck({ reload: mockReload, reset: mockReset }));
    
    act(() => result.current.setUploadJobs([{ jobId: '1', jobStatus: 'running' }]));

    await new Promise((r) => setTimeout(r, 5100)); // simulate interval

    expect(mockReload).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalled();
  });
});
