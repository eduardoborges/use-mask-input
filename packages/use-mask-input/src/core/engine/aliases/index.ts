import { extend } from '../extend';

import { baseAliases } from './base';
import { datetimeAliases } from './datetime';
import { numericAliases } from './numeric';

import type { InputmaskFactory } from '../Inputmask';
import type { AliasRegistration } from '../types';

/** In the order Inputmask loads its extensions. */
export const aliasRegistrations: AliasRegistration[] = [
  baseAliases,
  datetimeAliases,
  numericAliases,
];

/** Adds the built-in names, definitions and aliases to the prototype registries of `Inputmask`. */
export function registerAliases(Inputmask: InputmaskFactory): void {
  aliasRegistrations.forEach(({ i18n, definitions, aliases }) => {
    if (i18n) extend(true, Inputmask.prototype.i18n, i18n);
    if (definitions) Inputmask.extendDefinitions(definitions);
    if (aliases) Inputmask.extendAliases(aliases);
  });
}
