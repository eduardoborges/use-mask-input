import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

vi.mock('../utils/isServer', () => ({
  default: true,
}));

describe('useMaskInput server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns a no-op ref and an empty unmasked value', async () => {
    const { default: useMaskInput } = await import('./useMaskInput');
    const { maskRef, unmaskedValue } = useMaskInput('cpf');

    expect(typeof maskRef).toBe('function');
    expect(unmaskedValue()).toBe('');
  });

  it('does not mask when the ref is called on the server', async () => {
    const { default: useMaskInput } = await import('./useMaskInput');
    const { maskRef, unmaskedValue } = useMaskInput('cpf');
    const input = document.createElement('input');

    maskRef(input);

    expect(input.inputmask).toBeUndefined();
    expect(unmaskedValue()).toBe('');
  });
});
