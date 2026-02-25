import { describe, expect, it } from 'vitest';

import { getMaskOptions } from './maskConfig';

describe('maskConfig', () => {
  describe('getMaskOptions', () => {
    it('returns default options when no mask is provided', () => {
      const options = getMaskOptions();
      expect(options).toEqual({
        jitMasking: false,
      });
    });

    it('merges custom options with defaults', () => {
      const options = getMaskOptions(undefined, { placeholder: '_' });
      expect(options).toEqual({
        jitMasking: false,
        placeholder: '_',
      });
    });

    it('returns options for datetime mask', () => {
      const options = getMaskOptions('datetime');
      expect(options).toEqual({
        alias: 'datetime',
        jitMasking: false,
      });
    });

    it('returns options for email mask', () => {
      const options = getMaskOptions('email');
      expect(options).toEqual({
        alias: 'email',
        placeholder: '',
        jitMasking: false,
      });
    });

    it('returns options for numeric mask', () => {
      const options = getMaskOptions('numeric');
      expect(options).toEqual({
        alias: 'numeric',
        placeholder: '',
        jitMasking: false,
      });
    });

    it('returns options for currency mask', () => {
      const options = getMaskOptions('currency');
      expect(options).toEqual({
        alias: 'currency',
        prefix: '$ ',
        placeholder: '',
        jitMasking: false,
      });
    });

    it('returns options for decimal mask', () => {
      const options = getMaskOptions('decimal');
      expect(options).toEqual({
        alias: 'decimal',
        placeholder: '',
        jitMasking: false,
      });
    });

    it('returns options for integer mask', () => {
      const options = getMaskOptions('integer');
      expect(options).toEqual({
        alias: 'integer',
        placeholder: '',
        jitMasking: false,
      });
    });

    it('returns options for percentage mask', () => {
      const options = getMaskOptions('percentage');
      expect(options).toEqual({
        alias: 'percentage',
        placeholder: ' %',
        suffix: ' %',
        jitMasking: false,
      });
    });

    it('returns options for url mask', () => {
      const options = getMaskOptions('url');
      expect(options).toEqual({
        alias: 'url',
        placeholder: 'https://',
        jitMasking: false,
      });
    });

    it('returns options for ip mask', () => {
      const options = getMaskOptions('ip');
      expect(options).toEqual({
        alias: 'ip',
        jitMasking: false,
      });
    });

    it('returns options for mac mask', () => {
      const options = getMaskOptions('mac');
      expect(options).toEqual({
        alias: 'mac',
        jitMasking: false,
      });
    });

    it('returns options for ssn mask', () => {
      const options = getMaskOptions('ssn');
      expect(options).toEqual({
        alias: 'ssn',
        jitMasking: false,
      });
    });

    it('returns options for brl-currency mask', () => {
      const options = getMaskOptions('brl-currency');
      expect(options).toEqual({
        alias: 'currency',
        prefix: 'R$ ',
        placeholder: '0,00',
        displayFormat: 'currency',
        radixPoint: ',',
        groupSeparator: '.',
        autoUnmask: true,
        jitMasking: false,
      });
    });

    it('returns options for cpf mask', () => {
      const options = getMaskOptions('cpf');
      expect(options).toEqual({
        mask: '999.999.999-99',
        placeholder: '___.___.___-__',
        jitMasking: false,
      });
    });

    it('returns options for cnpj mask', () => {
      const options = getMaskOptions('cnpj');
      expect(options).toEqual({
        mask: ['A|9{2}.A|9{3}.A|9{3}/A|9{4}-9{2}'],
        placeholder: '__.___.___/____-__',
        jitMasking: false,
      });
    });

    it('returns custom mask string', () => {
      const options = getMaskOptions('999-999');
      expect(options).toEqual({
        mask: '999-999',
        jitMasking: false,
      });
    });

    it('returns custom mask array', () => {
      const mask = ['999-999', '9999-9999'];
      const options = getMaskOptions(mask);
      expect(options).toEqual({
        mask,
        jitMasking: false,
      });
    });

    it('merges custom options with alias options', () => {
      const options = getMaskOptions('cpf', { placeholder: '___' });
      expect(options).toEqual({
        mask: '999.999.999-99',
        placeholder: '___',
        jitMasking: false,
      });
    });

    it('handles null mask', () => {
      const options = getMaskOptions(null);
      expect(options).toEqual({
        jitMasking: false,
      });
    });
  });
});
