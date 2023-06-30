import { Mask, Options } from '../types';

export const getMaskOptions = (mask?: Mask, _options?: Options): Options => {
  const options: Options = {
    ..._options,
    jitMasking: false,
  };
  if (!mask) return options;

  const masks: Record<string, Inputmask.Options> = {
    datetime: {
      alias: 'datetime',
      inputFormat: 'dd/mm/yyyy',
      placeholder: 'dd/mm/yyyy',
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

  };

  if (typeof mask === 'string') {
    if (masks[mask]) return masks[mask];
  } else if (typeof mask === 'object') {
    return {
      ...mask,
      ...options,
    };
  }

  return {
    mask,
    ...options,
  };
};
