import {
  afterEach, describe, expect, it,
} from 'vitest';

import Inputmask from '../Inputmask';

import { baseAliases } from './base';
import { datetimeAliases } from './datetime';
import { aliasRegistrations, registerAliases } from './index';
import { numericAliases } from './numeric';

import type { AliasRegistration } from '../types';

describe('alias registration', () => {
  const added: AliasRegistration[] = [];

  /** Registers one extra module for the duration of a test. */
  const register = (registration: AliasRegistration): void => {
    added.push(registration);
    aliasRegistrations.push(registration);
    registerAliases(Inputmask);
  };

  afterEach(() => {
    added.splice(0).forEach((registration) => {
      aliasRegistrations.splice(aliasRegistrations.indexOf(registration), 1);
      Object.keys(registration.aliases || {}).forEach((name) => {
        delete Inputmask.prototype.aliases[name];
      });
      Object.keys(registration.definitions || {}).forEach((symbol) => {
        delete Inputmask.prototype.definitions[symbol];
      });
      Object.keys(registration.i18n || {}).forEach((key) => {
        delete Inputmask.prototype.i18n[key as keyof typeof Inputmask.prototype.i18n];
      });
    });
  });

  it('lists the alias modules in the order Inputmask loads its extensions', () => {
    expect(aliasRegistrations).toEqual([baseAliases, datetimeAliases, numericAliases]);
    expect(aliasRegistrations[0]).toBe(baseAliases);
    expect(aliasRegistrations[1]).toBe(datetimeAliases);
    expect(aliasRegistrations[2]).toBe(numericAliases);
  });

  it('gives every module the registration shape', () => {
    [baseAliases, datetimeAliases, numericAliases].forEach((registration) => {
      expect(typeof registration.aliases).toBe('object');
      Object.keys(registration).forEach((key) => {
        expect(['i18n', 'definitions', 'aliases']).toContain(key);
      });
    });
    expect(typeof baseAliases.definitions).toBe('object');
    expect(typeof datetimeAliases.i18n).toBe('object');
  });

  it('adds aliases to the prototype', () => {
    register({ aliases: { sample: { mask: '99-99', placeholder: '#' } } });

    expect(Inputmask.prototype.aliases.sample).toEqual({ mask: '99-99', placeholder: '#' });
    expect(Inputmask('sample').opts.mask).toBe('99-99');
  });

  it('adds definitions to the prototype', () => {
    register({ definitions: { Z: { validator: '[zZ]', casing: 'upper' } } });

    expect(Inputmask.prototype.definitions.Z).toEqual({ validator: '[zZ]', casing: 'upper' });
  });

  it('adds names to the prototype', () => {
    register({ i18n: { ordinalSuffix: ['st', 'nd', 'rd', 'th'] } });

    expect(Inputmask.prototype.i18n.ordinalSuffix).toEqual(['st', 'nd', 'rd', 'th']);
  });

  it('copies what it registers, so a module cannot be changed through the prototype', () => {
    const registration: AliasRegistration = {
      i18n: { monthNames: ['Jan'] },
      aliases: { sample: { mask: '9', definitions: { x: { validator: '[0-9]' } } } },
    };
    register(registration);

    expect(Inputmask.prototype.aliases.sample).not.toBe(registration.aliases?.sample);
    expect(Inputmask.prototype.aliases.sample.definitions).not.toBe(registration.aliases?.sample.definitions);
    expect(Inputmask.prototype.i18n.monthNames).not.toBe(registration.i18n?.monthNames);
  });

  it('keeps the same registry objects, so references taken earlier stay valid', () => {
    const { aliases, definitions, i18n } = Inputmask.prototype;
    register({ i18n: { dayNames: ['Mon'] }, definitions: { Z: {} }, aliases: { sample: {} } });

    expect(Inputmask.prototype.aliases).toBe(aliases);
    expect(Inputmask.prototype.definitions).toBe(definitions);
    expect(Inputmask.prototype.i18n).toBe(i18n);
  });

  it('can run twice without changing the outcome', () => {
    register({ aliases: { sample: { mask: '99' } }, i18n: { dayNames: ['Mon', 'Tue'] } });
    const before = JSON.stringify([Inputmask.prototype.aliases, Inputmask.prototype.i18n]);

    registerAliases(Inputmask);

    expect(JSON.stringify([Inputmask.prototype.aliases, Inputmask.prototype.i18n])).toBe(before);
  });
});
