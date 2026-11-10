import { describe, expect, it } from 'vitest';

import { aliasRegistrations } from './aliases';
import Inputmask from './index';
import Factory from './Inputmask';

describe('engine entry', () => {
  it('exports the factory itself', () => {
    expect(Inputmask).toBe(Factory);
    expect(typeof Inputmask).toBe('function');
  });

  it('creates an engine without new', () => {
    const engine = Inputmask({ mask: '99-99' });

    expect(engine).toBeInstanceOf(Inputmask);
    expect(engine.opts.mask).toBe('99-99');
  });

  it('has every built-in alias, definition and name on the prototype', () => {
    aliasRegistrations.forEach((registration) => {
      Object.keys(registration.aliases || {}).forEach((name) => {
        expect(Inputmask.prototype.aliases[name], name).toBeDefined();
      });
      Object.keys(registration.definitions || {}).forEach((symbol) => {
        expect(Inputmask.prototype.definitions[symbol], symbol).toBeDefined();
      });
      Object.keys(registration.i18n || {}).forEach((key) => {
        expect(Inputmask.prototype.i18n, key).toHaveProperty(key);
      });
    });
  });

  it('keeps the core definitions next to the registered ones', () => {
    expect(Object.keys(Inputmask.prototype.definitions)).toEqual(expect.arrayContaining(['9', 'a', '*']));
  });

  it('leaves the window alone', () => {
    expect('Inputmask' in window).toBe(false);
  });
});
