import { act, renderHook } from '@testing-library/react';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

vi.mock('../utils/isServer', () => ({
  default: true,
}));

describe('useMaskInput server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns no-op function on server', async () => {
    const { default: useInputMask } = await import('./useInputMask');
    const { result } = renderHook(() => useInputMask({ mask: '999-999' }));

    expect(typeof result.current).toBe('function');

    act(() => {
      result.current(document.createElement('input'));
    });

    // should do nothing on server
    expect(result.current).toBeDefined();
  });
});
