// tests/tracks.test.ts
import { determineNewTrackOrder, isEqualDurations, fmtMSS } from '../tracks';

describe('Tracks Tests', () => {
  test('determineNewTrackOrder should move dragging track to new position', () => {
    const oldTracks = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = determineNewTrackOrder(oldTracks, 2, 1);
    
    expect(result).toEqual([{ id: 2 }, { id: 1 }, { id: 3 }]);
  });

  test('isEqualDurations should return true for nearly equal durations', () => {
    expect(isEqualDurations(10.00001, 10.00002)).toBe(true);
    expect(isEqualDurations(10.00001, 10.1)).toBe(false);
  });

  test('fmtMSS should format seconds into MM:SS', () => {
    expect(fmtMSS(125)).toBe('2:05');
    expect(fmtMSS(59)).toBe('0:59');
  });
});
