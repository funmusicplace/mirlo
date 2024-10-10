// tests/useDraggableTrack.test.ts
import { renderHook } from '@testing-library/react-hooks';
import useDraggableTrack from '../useDraggableTrack';
import { useGlobalStateContext } from 'state/GlobalState';

jest.mock('state/GlobalState');

describe('useDraggableTrack Tests', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    useGlobalStateContext.mockReturnValue({ dispatch: mockDispatch });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('onDragStart should dispatch dragging track ID', () => {
    const { result } = renderHook(() => useDraggableTrack());
    const mockEvent = { currentTarget: { id: '1' } };

    result.current.onDragStart(mockEvent);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'setDraggingTrackId',
      draggingTrackId: 1,
    });
  });

  test('onDragEnd should clear dragging track ID', () => {
    const { result } = renderHook(() => useDraggableTrack());
    
    result.current.onDragEnd();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'setDraggingTrackId',
      draggingTrackId: undefined,
    });
  });
});
