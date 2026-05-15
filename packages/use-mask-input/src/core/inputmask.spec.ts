import { describe, expect, it } from 'vitest';

import inputmask from './inputmask';

describe('inputmask wrapper', () => {
  it('loads the aliases used by built-in masks', () => {
    const aliases = (inputmask as unknown as { prototype: { aliases: Record<string, unknown> } }).prototype.aliases;

    expect(aliases.datetime).toBeDefined();
    expect(aliases.email).toBeDefined();
    expect(aliases.numeric).toBeDefined();
    expect(aliases.currency).toBeDefined();
    expect(aliases.decimal).toBeDefined();
    expect(aliases.integer).toBeDefined();
    expect(aliases.percentage).toBeDefined();
    expect(aliases.url).toBeDefined();
    expect(aliases.ip).toBeDefined();
    expect(aliases.mac).toBeDefined();
    expect(aliases.ssn).toBeDefined();
  });
});
