export const presets = {
  // Brazilian documents
  CPF: '999.999.999-99',
  CNPJ: '99.999.999/9999-99',
  CPF_CNPJ: ['999.999.999-99', '99.999.999/9999-99'],

  // Phone numbers
  PHONE: ['(99) 9999-9999', '(99) 99999-9999'],
  BR_PHONE: ['(99) 9999-9999', '(99) 99999-9999'],

  // Numbers and currency
  DECIMAL: '[DECIMAL]',
  CURRENCY: '[DECIMAL]',

  // Common formats
  DATE: '99/99/9999',
  TIME: '99:99',
  ZIP_CODE: '99999-999',
  LICENSE_PLATE: 'AAA-9999',
  EMAIL: '*******************',

  // Credit card
  CREDIT_CARD: '9999 9999 9999 9999',
  CVV: '999',
  EXPIRY: '99/99',
} as const;
