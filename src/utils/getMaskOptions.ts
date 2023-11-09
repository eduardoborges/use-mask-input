import { Mask, Options } from '../types';

export const getMaskOptions = (mask?: Mask, _options?: Options): Options => {
  const options: Options = {
    jitMasking: false,
    ..._options,
  };
  if (!mask) return options;

  const masks: Record<string, Inputmask.Options> = {
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
      mask: '99.999.999/9999-99',
      placeholder: '__.___.___/____-__',
      ...options,
    },
  };

  if (typeof mask === 'string' && masks[mask]) return masks[mask];

  return {
    mask,
    ...options,
  };
};
