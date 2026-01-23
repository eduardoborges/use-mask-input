import { describe, expect, it } from 'vitest';

describe('isServer', () => {
  it('returns boolean value', async () => {
    const { default: isServer } = await import('./isServer');
    expect(typeof isServer).toBe('boolean');
  });

  it('returns false in browser environment', async () => {
    // in jsdom environment, window and document exist
    const { default: isServer } = await import('./isServer');
    // in test environment with jsdom, it should be false
    expect(isServer).toBe(false);
  });
});
