import { describe, expect, it } from 'vitest';

import { isValidWithMask } from './maskEngine';

import type { Mask } from '../types';

/**
 * Real engine, no mocks: the answer for each built-in alias, fed the value the
 * way a schema validator sees it. `maskEngine.spec.ts` covers the call shape;
 * this file exists because `Inputmask.isValid` alone said "false" for a
 * complete phone-br, credit-card, brl-currency and mac, and this table is the
 * proof it no longer does.
 */
const VALID: [Mask, string][] = [
  ['cpf', '12345678901'],
  ['cpf', '123.456.789-01'],
  ['cnpj', '12345678000195'],
  ['cep', '12345678'],
  ['phone-br', '1199999999'],
  ['phone-br', '11999999999'],
  ['phone-br', '(11) 99999-9999'],
  ['credit-card', '4111111111111111'],
  ['credit-card', '378282246310005'],
  ['plate-br', 'ABC1234'],
  ['plate-br', 'abc1d23'],
  ['br-bank-account', '1234567-9'],
  ['br-bank-agency', '1234'],
  ['br-bank-agency', '1234-5'],
  ['brl-currency', '1000'],
  ['brl-currency', '1000,00'],
  ['currency', '10'],
  ['percentage', '50'],
  ['numeric', '1234.5'],
  ['integer', '42'],
  ['date-br', '12122024'],
  ['date-br', '12/12/2024'],
  ['time', '23:59'],
  ['email', 'a@b.co'],
  ['url', 'https://x.io'],
  ['ip', '1.1.1.1'],
  ['mac', 'aa:bb:cc:dd:ee:ff'],
  ['ssn', '123456789'],
  [['99-99', '999-999'], '1234'],
  ['9{1,3}', '12'],
];

const INVALID: [Mask, string][] = [
  ['cpf', ''],
  ['cpf', '123'],
  ['cpf', 'abc'],
  ['phone-br', '119999'],
  ['credit-card', '4111'],
  ['plate-br', 'AB'],
  ['br-bank-account', '1234567'],
  ['br-bank-agency', ''],
  ['numeric', 'abc'],
  ['date-br', '12/12/20'],
  ['time', '2'],
  ['email', 'a@b'],
  ['email', 'not an email'],
  ['ip', '1.1'],
  ['9{1,3}', ''],
];

describe('isValidWithMask against the real engine', () => {
  it.each(VALID)('%s accepts %j', (mask, value) => {
    expect(isValidWithMask(value, mask)).toBe(true);
  });

  it.each(INVALID)('%s rejects %j', (mask, value) => {
    expect(isValidWithMask(value, mask)).toBe(false);
  });

  it('treats a null mask as no constraint', () => {
    expect(isValidWithMask('anything', null)).toBe(true);
  });

  // Empty is not one answer across aliases: literal masks have required
  // positions, open-ended numeric ones do not. Schemas own "required".
  it('answers empty per mask', () => {
    expect(isValidWithMask('', 'numeric')).toBe(true);
    expect(isValidWithMask('', 'brl-currency')).toBe(true);
    expect(isValidWithMask('', 'cpf')).toBe(false);
  });
});
