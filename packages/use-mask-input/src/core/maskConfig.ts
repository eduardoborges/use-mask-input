/* eslint-disable import-x/prefer-default-export */
import type { Mask, Options } from '../types';
import type { Options as InputmaskOptions } from '../types/inputmask.types';

/** Base config for built-in mask aliases. Merged with user options in getMaskOptions. */
const ALIAS_MASKS: Record<string, InputmaskOptions> = {
  datetime: { alias: 'datetime' },
  email: { alias: 'email', placeholder: '' },
  numeric: { alias: 'numeric', placeholder: '' },
  currency: { alias: 'currency', prefix: '$ ', placeholder: '' },
  decimal: { alias: 'decimal', placeholder: '' },
  integer: { alias: 'integer', placeholder: '' },
  percentage: { alias: 'percentage', placeholder: ' %', suffix: ' %' },
  url: { alias: 'url', placeholder: 'https://' },
  ip: { alias: 'ip' },
  mac: { alias: 'mac' },
  ssn: { alias: 'ssn' },
  'brl-currency': {
    alias: 'currency',
    prefix: 'R$ ',
    placeholder: '0,00',
    displayFormat: 'currency',
    radixPoint: ',',
    groupSeparator: '.',
    autoUnmask: true,
  },
  cpf: { mask: '999.999.999-99', placeholder: '___.___.___-__' },
  cnpj: {
    mask: ['A|9{2}.A|9{3}.A|9{3}/A|9{4}-9{2}'],
    placeholder: '__.___.___/____-__',
  },
  'br-bank-account': {
    mask: [
      '9{4,10}[-]9', // Most common formats: 1234567-9, 12345678-9, 123456789-9, 1234567890-1
      '999999[-][9]', // Optional separator: 123456-7 or 1234567
      '[999]9{7,8}[-]9', // Caixa and Nu Pagamentos: (001)12345678-9 or (001)1234567-9
      '[9999]9{8}[-]9', // Caixa longer: (0001)12345678-9
    ],
    placeholder: '',
    greedy: false,
  },
  'br-bank-agency': {
    mask: '9{1,5}[-][9]', // Agency numbers: 1234, 12345, 1234-5
    placeholder: '',
  },
};

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

  if (typeof mask === 'string' && ALIAS_MASKS[mask]) {
    return { ...ALIAS_MASKS[mask], ...options } as Options;
  }

  return {
    mask,
    ...options,
  };
}
