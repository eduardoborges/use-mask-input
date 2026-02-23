import { act, renderHook } from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('../utils/isServer', () => ({
  default: true,
}));

describe('useMaskInputAntd server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns no-op function on server', async () => {
    const { default: useMaskInputAntd } = await import('./useMaskInputAntd');
    const { result } = renderHook(
      () => useMaskInputAntd({ mask: '999-999' }),
    );

    expect(typeof result.current).toBe('function');

    act(() => {
      result.current({ input: document.createElement('input') } as unknown as { input: HTMLElement });
    });

    // should do nothing on server
    expect(result.current).toBeDefined();
  });
});

