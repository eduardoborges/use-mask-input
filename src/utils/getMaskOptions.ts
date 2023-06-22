import { Mask, Options } from '../types';

export const getMaskOptions = (mask: Mask, _options?: Options) => {
  const options: Options = {
    ..._options,
    jitMasking: false,
  };

  if (mask === 'datetime') {
    return {
      alias: 'datetime',
      inputFormat: 'dd/mm/yyyy',
      placeholder: 'dd/mm/yyyy',
      ...options,
    };
  }

  if (mask === 'cpf') {
    return {
      mask: '999.999.999-99',
      placeholder: '___.___.___-__',
      ...options,
    };
  }

  if (mask === 'email') {
    return {
      alias: 'email',
      placeholder: '',
      ...options,
    };
  }
  if (mask === 'numeric') {
    return {
      alias: 'numeric',
      placeholder: '',
      ...options,
    };
  }

  // currency
  if (mask === 'currency') {
    return {
      alias: 'currency',
      prefix: '$ ',
      placeholder: '',
      ...options,
    };
  }

  // decimal
  if (mask === 'decimal') {
    return {
      alias: 'decimal',
      placeholder: '',
      ...options,
    };
  }

  // integer
  if (mask === 'integer') {
    return {
      alias: 'integer',
      placeholder: '',
      ...options,
    };
  }

  // percentage
  if (mask === 'percentage') {
    return {
      alias: 'percentage',
      placeholder: ' %',
      suffix: ' %',
      ...options,
    };
  }

  // url
  if (mask === 'url') {
    return {
      alias: 'url',
      placeholder: 'https://',
      ...options,
    };
  }

  // url
  if (mask === 'ip') {
    return {
      alias: 'ip',
      ...options,
    };
  }

  // mac
  if (mask === 'mac') {
    return {
      alias: 'mac',
      ...options,
    };
  }

  // ssn
  if (mask === 'ssn') {
    return {
      alias: 'ssn',
      ...options,
    };
  }

  // regex
  if (mask === 'regex') {
    return {
      alias: 'regex',
      ...options,
    };
  }

  return {
    mask,
    ...options,
  };
};
