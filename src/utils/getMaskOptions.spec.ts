import { describe, it, expect } from 'vitest';
import { getMaskOptions } from './getMaskOptions';

describe('getMaskOptions', () => {
  it('returns default options when no mask is provided', () => {
    const options = getMaskOptions();
    expect(options).toEqual({
      jitMasking: false,
    });
  });

  it('returns options for datetime mask', () => {
    const options = getMaskOptions('datetime');
    expect(options).toEqual({
      alias: 'datetime',
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

  it('returns options for custom mask', () => {
    const options = getMaskOptions('999-999');
    expect(options).toEqual({
      mask: '999-999',
      jitMasking: false,
    });
  });
});
