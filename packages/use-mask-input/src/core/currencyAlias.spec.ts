import { describe, expect, it } from 'vitest';

import { formatWithMask } from './maskEngine';

import type { Options } from '../types';

/**
 * Real engine, no mocks. With fixed decimals and an empty placeholder,
 * inputmask formatted 1234.56 as '$ .56', so the currency aliases must keep a
 * non-empty placeholder.
 */
const CASES: [string, string, Options | undefined, string][] = [
  ['currency', '1234.56', undefined, '$ 1,234.56'],
  ['currency', '1234,56', { prefix: 'R$ ', groupSeparator: '.', radixPoint: ',' }, 'R$ 1.234,56'],
  ['brl-currency', '1234,56', undefined, 'R$ 1.234,56'],
];

describe('currency aliases against the real engine', () => {
  it.each(CASES)('%s formats %j with %j', (mask, value, options, expected) => {
    expect(formatWithMask(value, mask, options)).toBe(expected);
  });
});
