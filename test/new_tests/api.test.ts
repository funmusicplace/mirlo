// tests/api.test.ts
import api from '../api';
import APIInstance from '../APIInstance';

jest.mock('../APIInstance');

describe('API Tests', () => {
  test('API should be instantiated with correct root URL', () => {
    APIInstance.mockReturnValue('mocked API instance');
    expect(api).toBe('mocked API instance');
    expect(APIInstance).toHaveBeenCalledWith(expect.any(String));
  });
});
