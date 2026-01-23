import type { Mask, Options } from '../types';
import type { Options as InputmaskOptions } from '../types/inputmask.types';

/**
 * Converts mask and options into Inputmask configuration.
 * Has some ready aliases to make life easier.
 *
 * @param mask - The mask pattern or alias
 * @param _options - Optional configuration options
 * @returns Inputmask configuration object
 */
export function getMaskOptions(mask?: Mask, _options?: Options): Options {
  const options: Options = {
    jitMasking: false,
    ..._options,
  };
  if (!mask) return options;

  const masks: Record<string, InputmaskOptions> = {
    datetime: {
      alias: 'datetime',
      ...options,
    },
    email: {
      alias: 'email',
      placeholder: '',
      ...options,
    },
    numeric: {
      alias: 'numeric',
      placeholder: '',
      ...options,
    },
    currency: {
      alias: 'currency',
      prefix: '$ ',
      placeholder: '',
      ...options,
    },
    decimal: {
      alias: 'decimal',
      placeholder: '',
      ...options,
    },
    integer: {
      alias: 'integer',
      placeholder: '',
      ...options,
    },
    percentage: {
      alias: 'percentage',
      placeholder: ' %',
      suffix: ' %',
      ...options,
    },
    url: {
      alias: 'url',
      placeholder: 'https://',
      ...options,
    },
    ip: {
      alias: 'ip',
      ...options,
    },
    mac: {
      alias: 'mac',
      ...options,
    },
    ssn: {
      alias: 'ssn',
      ...options,
    },

    // alias for brazilians <3
    'brl-currency': {
      alias: 'currency',
      prefix: 'R$ ',
      placeholder: '0,00',
      displayFormat: 'currency',
      radixPoint: ',',
      autoUnmask: true,
      ...options,
    },
    cpf: {
      mask: '999.999.999-99',
      placeholder: '___.___.___-__',
      ...options,
    },
    cnpj: {
      mask: ['A|9{2}.A|9{3}.A|9{3}/A|9{4}-9{2}'],
      placeholder: '__.___.___/____-__',
      ...options,
    },
  };

  if (typeof mask === 'string' && masks[mask]) return masks[mask];

  return {
    mask,
    ...options,
  };
}
