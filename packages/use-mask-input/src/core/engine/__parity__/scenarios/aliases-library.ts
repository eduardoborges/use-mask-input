import {
  alias, blur, chars, focus, interactive, mask, paste, press, select, setValue, staticCase,
  typing,
} from '../scenario';

import type { Scenario } from '../types';

/**
 * Every alias this library ships in `core/maskConfig.ts`, resolved through
 * `getMaskOptions` exactly as the hooks resolve them, so the options the
 * engine receives here are the ones users get.
 */

const cpf = alias('cpf');
const cnpj = alias('cnpj');
const cep = alias('cep');
const phone = alias('phone-br');
const dateBr = alias('date-br');
const time = alias('time');
const creditCard = alias('credit-card');
const plate = alias('plate-br');
const bankAccount = alias('br-bank-account');
const bankAgency = alias('br-bank-agency');
const brl = alias('brl-currency');

const DIGITS = ['', '1', '123', '12345678', '12345678901', '12345678901234', '1234567890123456789', 'abc', 'a1b2c3d4', ' '];

export const scenarios: Scenario[] = [
  staticCase('library/cpf/static', cpf, [...DIGITS, '123.456.789-01', '123.456.789-0', '000.000.000-00']),
  staticCase('library/cnpj/static', cnpj, [...DIGITS, '12.345.678/0001-99', '12ABC34501DE35', '12.ABC.345/01DE-35', 'ab.cde.fgh/ijkl-mn']),
  staticCase('library/cep/static', cep, [...DIGITS, '01310-100', '01310100', '0131-0100']),
  staticCase('library/phone-br/static', phone, [...DIGITS, '1133334444', '11987654321', '(11) 3333-4444', '(11) 98765-4321', '+55 11 98765-4321']),
  staticCase('library/date-br/static', dateBr, [...DIGITS, '15062024', '15/06/2024', '31/02/2024', '15/45/2024', '32/01/2024']),
  staticCase('library/time/static', time, [...DIGITS, '0930', '09:30', '2359', '2460', '9:5']),
  staticCase('library/credit-card/static', creditCard, [...DIGITS, '4111111111111111', '378282246310005', '4111 1111 1111 1111', '3782 822463 10005']),
  staticCase('library/plate-br/static', plate, [...DIGITS, 'abc1234', 'ABC-1234', 'abc1d23', 'ABC1D23', 'ab1', '1234abc']),
  staticCase('library/br-bank-account/static', bankAccount, [...DIGITS, '1234567-9', '123456-7', '1234567', '001123456789', '12345678-9', '1234567890-1']),
  staticCase('library/br-bank-agency/static', bankAgency, [...DIGITS, '1234', '12345', '1234-5', '12345-6', '123456']),
  staticCase('library/brl-currency/static', brl, [...DIGITS, '1234,56', '1.234,56', '1234.56', '-10', '0,5', 'R$ 10,00']),
  staticCase('library/datetime/static', alias('datetime'), [...DIGITS, '2024-06-15T10:20:30', '20240615102030']),
  staticCase('library/email/static', alias('email'), ['', 'john@doe.com', 'JOHN@DOE.COM', 'a@b', 'not an email']),
  staticCase('library/numeric/static', alias('numeric'), [...DIGITS, '1234.56', '-5', '1,5']),
  staticCase('library/currency/static', alias('currency'), [...DIGITS, '1234.56', '-5', '$ 10']),
  staticCase('library/decimal/static', alias('decimal'), [...DIGITS, '1234.56', '-5', '.5']),
  staticCase('library/integer/static', alias('integer'), [...DIGITS, '1234.56', '-5']),
  staticCase('library/percentage/static', alias('percentage'), [...DIGITS, '50', '150', '50 %', '-5']),
  staticCase('library/url/static', alias('url'), ['', 'https://', 'https://example.com', 'example.com']),
  staticCase('library/ip/static', alias('ip'), ['', '192.168.1.1', '19216811', '999.1.1.1']),
  staticCase('library/mac/static', alias('mac'), ['', 'aabbccddeeff', 'AA:BB:CC:DD:EE:FF', 'zz']),
  staticCase('library/ssn/static', alias('ssn'), ['', '123456789', '123-45-6789', '666-12-3456']),
  staticCase('library/raw-pattern/static', alias('(99) 99999-9999'), DIGITS),
  staticCase('library/raw-array/static', alias(['999-999', '999-999-999']), DIGITS),
  staticCase('library/user-options-win/static', alias('cpf', { placeholder: '0', jitMasking: true }), DIGITS),
  staticCase('library/no-mask/static', alias(null), DIGITS),

  typing('library/cpf/typing', cpf, '12345678901'),
  typing('library/cpf/typing-overflow', cpf, '1234567890123'),
  typing('library/cnpj/typing-digits', cnpj, '12345678000199'),
  typing('library/cnpj/typing-alphanumeric', cnpj, '12abc34501de35'),
  typing('library/cep/typing', cep, '01310100'),
  typing('library/phone-br/typing-landline', phone, '1133334444'),
  typing('library/phone-br/typing-mobile', phone, '11987654321'),
  typing('library/date-br/typing', dateBr, '15062024'),
  typing('library/date-br/typing-minutes-as-month', dateBr, '15452024'),
  typing('library/time/typing', time, '0930'),
  typing('library/time/typing-overflow', time, '2561'),
  typing('library/credit-card/typing-16', creditCard, '4111111111111111'),
  typing('library/credit-card/typing-15', creditCard, '378282246310005'),
  typing('library/plate-br/typing-old', plate, 'abc1234'),
  typing('library/plate-br/typing-mercosul', plate, 'abc1d23'),
  typing('library/br-bank-account/typing-short', bankAccount, '1234567'),
  typing('library/br-bank-account/typing-long', bankAccount, '12345678901'),
  typing('library/br-bank-agency/typing', bankAgency, '123456'),
  typing('library/brl-currency/typing', brl, '123456'),
  typing('library/brl-currency/typing-negative', brl, '-12,5'),
  typing('library/currency/typing', alias('currency'), '1234.5'),
  typing('library/percentage/typing', alias('percentage'), '85'),
  typing('library/integer/typing', alias('integer'), '12.3'),
  typing('library/decimal/typing', alias('decimal'), '12.34'),
  typing('library/numeric/typing', alias('numeric'), '-1.5'),
  typing('library/email/typing', alias('email'), 'Ana@x.io'),
  typing('library/url/typing', alias('url'), 'example'),
  typing('library/ip/typing', alias('ip'), '10.0.0.1'),
  typing('library/mac/typing', alias('mac'), '0a1b2c3d4e5f'),
  typing('library/ssn/typing', alias('ssn'), '123456789'),
  typing('library/datetime/typing', alias('datetime'), '20240615102030'),

  interactive('library/cpf/erase-and-retype', cpf, [
    mask(), focus(), chars('12345678901'), press('Backspace'), press('Backspace'), select(4, 7),
    press('Delete'), chars('999'), blur(),
  ]),
  interactive('library/cpf/paste-masked-and-raw', cpf, [
    mask(), focus(), paste('123.456.789-01'), select(0, 14), paste('98765432100'), blur(),
  ]),
  interactive('library/phone-br/grows-to-mobile-and-back', phone, [
    mask(), focus(), chars('1133334444'), chars('5'), press('Backspace'), press('Backspace'), blur(),
  ]),
  interactive('library/credit-card/switches-pattern', creditCard, [
    mask(), focus(), chars('378282246310005'), chars('1'), press('Backspace'), blur(),
  ]),
  interactive('library/brl-currency/auto-unmask-value', brl, [
    mask(), setValue('1234.56'), focus(), chars('7'), blur(), setValue('0'),
  ]),
  interactive('library/plate-br/set-value-lowercase', plate, [
    mask(), setValue('abc1d23'), setValue('xyz9876'), focus(), press('Backspace'), blur(),
  ]),
  interactive('library/cep/initial-value', cep, [
    mask(), focus(), press('Backspace'), chars('9'), blur(),
  ], { element: { value: '01310100' } }),
  interactive('library/cpf/maxlength-left-in-place', cpf, [
    mask(), focus(), chars('12345678901'), blur(),
  ], { element: { attrs: { maxlength: '11' } } }),
];
